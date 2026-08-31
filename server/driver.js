/**
 * One async database interface, two backings:
 *
 *   node:sqlite      a file on a disk this process owns — local dev, Docker, VPS
 *   @libsql/client   Turso over HTTP — Vercel, or anywhere without a disk
 *
 * Turso speaks SQLite, so the SQL in db.js is identical either way; only the
 * call shape differs. Everything here is async even on the local driver, so the
 * routes never have to know which one they are talking to.
 *
 * Setting TURSO_DATABASE_URL picks Turso. Without it the local file is used.
 */

const TURSO_URL = process.env.TURSO_DATABASE_URL

/** Neither driver accepts `undefined`; a missing value means SQL NULL. */
const clean = (args) => args.map((v) => (v === undefined ? null : v))

async function makeLocal() {
  const { mkdirSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const { DatabaseSync } = await import('node:sqlite')

  const here = dirname(fileURLToPath(import.meta.url))
  const dataDir = process.env.DATA_DIR ?? join(here, 'data')
  mkdirSync(dataDir, { recursive: true })
  const file = join(dataDir, 'orders.db')

  const db = new DatabaseSync(file)
  // WAL lets the admin page read while an order is being written; neither
  // pragma means anything to Turso, which is why they live in this driver
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

  const cache = new Map()
  const stmt = (sql) => {
    let s = cache.get(sql)
    if (!s) {
      s = db.prepare(sql)
      cache.set(sql, s)
    }
    return s
  }

  const api = {
    label: `node:sqlite · ${file}`,
    async run(sql, args = []) {
      const r = stmt(sql).run(...clean(args))
      return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) }
    },
    async all(sql, args = []) {
      return stmt(sql).all(...clean(args))
    },
    async get(sql, args = []) {
      return stmt(sql).get(...clean(args))
    },
    async script(sql) {
      db.exec(sql)
    },
    /** All or nothing. Locally that is a transaction; round trips are free. */
    async batch(statements) {
      db.exec('BEGIN')
      try {
        for (const [sql, args = []] of statements) stmt(sql).run(...clean(args))
        db.exec('COMMIT')
      } catch (err) {
        try {
          db.exec('ROLLBACK')
        } catch {
          /* the transaction was never opened, or the handle is gone */
        }
        throw err
      }
    },
    close() {
      try {
        db.close()
      } catch {
        /* already closed */
      }
    },
  }
  return api
}

async function makeTurso() {
  // the `/web` entry is pure fetch, with none of the optional native bindings
  // the default entry pulls in for embedded replicas — which is what lets this
  // bundle cleanly into a serverless function. A file: URL is only ever used
  // locally, to exercise this driver without a Turso account.
  const local = String(TURSO_URL).startsWith('file:')
  const { createClient } = local
    ? await import('@libsql/client')
    : await import('@libsql/client/web')

  const client = createClient({
    url: TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  // libSQL rows carry their column names, but copying them into plain objects
  // keeps what the routes hand to res.json() identical across drivers
  const rows = (result) => result.rows.map((row) => ({ ...row }))

  const bound = (exec) => ({
    async run(sql, args = []) {
      const r = await exec({ sql, args: clean(args) })
      return {
        lastInsertRowid: Number(r.lastInsertRowid ?? 0),
        changes: Number(r.rowsAffected ?? 0),
      }
    },
    async all(sql, args = []) {
      return rows(await exec({ sql, args: clean(args) }))
    },
    async get(sql, args = []) {
      return rows(await exec({ sql, args: clean(args) }))[0]
    },
  })

  const api = {
    label: `turso · ${String(TURSO_URL).replace(/\?.*$/, '')}`,
    ...bound((s) => client.execute(s)),
    async script(sql) {
      await client.executeMultiple(sql)
    },
    /**
     * All or nothing, in a single round trip. This is the whole reason the write
     * path is expressed as a batch rather than as an open transaction: a
     * transaction would cost one round trip per statement, and against a
     * database on another continent that is the difference between 2 seconds
     * and 200 milliseconds.
     */
    async batch(statements) {
      await client.batch(
        statements.map(([sql, args = []]) => ({ sql, args: clean(args) })),
        'write',
      )
    },
    close() {
      client.close()
    },
  }
  return api
}

let pending

/** Opens the driver on first use and reuses it for the life of the process. */
export function getDriver() {
  pending ??= TURSO_URL ? makeTurso() : makeLocal()
  return pending
}

export const usingTurso = Boolean(TURSO_URL)
