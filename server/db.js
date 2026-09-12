import { getDriver } from './driver.js'

/**
 * Orders and their lines. Every function here is async because one of the two
 * drivers talks to Turso over HTTP — see driver.js.
 */

export const STATUSES = ['yeni', 'təsdiqlənib', 'hazırlanır', 'göndərilib', 'ləğv']

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nomre       TEXT    NOT NULL UNIQUE,
    yaradilib   TEXT    NOT NULL,
    ad          TEXT    NOT NULL,
    telefon     TEXT    NOT NULL,
    seher       TEXT    NOT NULL,
    unvan       TEXT    NOT NULL,
    qeyd        TEXT    NOT NULL DEFAULT '',
    odenis      TEXT    NOT NULL,
    cem         REAL    NOT NULL,
    catdirilma  REAL    NOT NULL,
    yekun       REAL    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'yeni',
    ip          TEXT
  );

  CREATE TABLE IF NOT EXISTS order_lines (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ad            TEXT    NOT NULL,
    say           INTEGER NOT NULL,
    qram          INTEGER NOT NULL DEFAULT 100,
    vahid_qiymet  REAL    NOT NULL,
    terkib        TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_yaradilib ON orders(yaradilib DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_ip ON orders(ip, yaradilib);
  CREATE INDEX IF NOT EXISTS idx_lines_order ON order_lines(order_id);
`

/**
 * Columns added after the first release. CREATE TABLE IF NOT EXISTS leaves an
 * existing table alone, so each one is tried as an ALTER, and the "duplicate
 * column" it raises on a database that already has it is the expected outcome.
 */
const ADDED_COLUMNS = [["order_lines", "qram", "INTEGER NOT NULL DEFAULT 100"]]

async function migrate(d) {
  await d.script(SCHEMA)
  for (const [table, column, type] of ADDED_COLUMNS) {
    try {
      await d.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    } catch (err) {
      if (!/duplicate column/i.test(String(err?.message ?? err))) throw err
    }
  }
}

let migrated

/** The driver, with the schema applied once per process. */
async function conn() {
  const d = await getDriver()
  migrated ??= migrate(d)
  await migrated
  return d
}

/** Warms the connection and returns its label, for the startup log. */
export async function describeDb() {
  return (await conn()).label
}

/**
 * One atomic batch, so a half-written order can never be read by the admin page
 * — and so the whole write is one round trip rather than one per line.
 *
 * The lines look their order up by `nomre` instead of being handed its id: the
 * column is UNIQUE, and a subquery is what lets every statement be sent at once
 * instead of waiting for the insert to come back with a rowid.
 */
export async function createOrder(order, lines) {
  const d = await conn()
  await d.batch([
    [
      `INSERT INTO orders
         (nomre, yaradilib, ad, telefon, seher, unvan, qeyd, odenis, cem, catdirilma, yekun, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.nomre,
        order.yaradilib,
        order.ad,
        order.telefon,
        order.seher,
        order.unvan,
        order.qeyd,
        order.odenis,
        order.cem,
        order.catdirilma,
        order.yekun,
        order.ip,
      ],
    ],
    ...lines.map((l) => [
      `INSERT INTO order_lines (order_id, ad, say, qram, vahid_qiymet, terkib)
       VALUES ((SELECT id FROM orders WHERE nomre = ?), ?, ?, ?, ?, ?)`,
      [order.nomre, l.ad, l.say, l.qram, l.vahidQiymet, JSON.stringify(l.terkib)],
    ]),
  ])
}

export async function listOrders({ limit = 50, offset = 0, status = null } = {}) {
  const d = await conn()
  const orders = status
    ? await d.all(`SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [
        status,
        limit,
        offset,
      ])
    : await d.all(`SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset])
  if (orders.length === 0) return []

  // one query for every line on the page instead of one per order — over HTTP
  // to Turso each round trip costs real milliseconds
  const ids = orders.map((o) => o.id)
  const lines = await d.all(
    `SELECT * FROM order_lines WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
    ids,
  )
  const byOrder = new Map(ids.map((id) => [id, []]))
  for (const l of lines) {
    byOrder.get(l.order_id)?.push({
      ad: l.ad,
      say: l.say,
      qram: l.qram ?? 100,
      vahidQiymet: l.vahid_qiymet,
      terkib: JSON.parse(l.terkib),
    })
  }
  return orders.map((o) => ({ ...o, setirler: byOrder.get(o.id) ?? [] }))
}

export async function totalOrders() {
  const d = await conn()
  return (await d.get(`SELECT COUNT(*) AS n FROM orders`))?.n ?? 0
}

export async function setStatus(id, status) {
  if (!STATUSES.includes(status)) return false
  const d = await conn()
  const res = await d.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id])
  return res.changes > 0
}

/** How many orders this address has placed since `sinceIso`. */
export async function ordersSince(ip, sinceIso) {
  const d = await conn()
  const row = await d.get(`SELECT COUNT(*) AS n FROM orders WHERE ip = ? AND yaradilib > ?`, [
    ip,
    sinceIso,
  ])
  return row?.n ?? 0
}

/**
 * Closes the handle so SQLite can checkpoint the WAL. Container platforms send
 * SIGTERM and kill the process shortly after; without this the next start has
 * to recover the journal. A no-op worth calling on Turso too.
 */
export async function closeDb() {
  try {
    ;(await getDriver()).close()
  } catch {
    /* never opened, or already closed */
  }
}
