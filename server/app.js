/**
 * The Express app, without listening. Two entry points mount it:
 *
 *   server/index.js  binds a port — local dev, Docker, a VPS
 *   api/index.js     exports it as one Vercel serverless function
 *
 * On Vercel the static site is served by the edge, so the static block below is
 * skipped there and this handles only /api and /admin.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, timingSafeEqual } from 'node:crypto'
import compression from 'compression'
import express from 'express'
import {
  BY_ID,
  LEVELS,
  blendPrice,
  catalog,
  deliveryFee,
  isBase,
  roundPrice,
  weigh,
} from './catalog.js'
import { createOrder, listOrders, ordersSince, setStatus, STATUSES, totalOrders } from './db.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
export const PRODUCTION = process.env.NODE_ENV === 'production'
const ADMIN_USER = process.env.ADMIN_USER ?? 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'admin'
/** Orders one address may place in an hour before it is asked to phone instead. */
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 12)
/**
 * How many reverse proxies sit in front of this process. Express counts hops
 * from the right of X-Forwarded-For, so the number has to be exact: too low and
 * every visitor looks like the proxy, too high and a client can put whatever it
 * likes in the header and walk straight past the rate limit.
 */
const TRUST_PROXY = process.env.TRUST_PROXY ?? (PRODUCTION ? '1' : '0')

// the admin panel holds every customer's name, phone number and address; it
// must not go online behind admin/admin, and a warning in a log nobody reads
// is not enough to prevent that
if (PRODUCTION && ADMIN_PASS === 'admin') {
  console.error(
    'Server başlamadı: NODE_ENV=production, amma ADMIN_PASS hələ «admin»dir.\n' +
      'Admin paneli bütün müştəri adlarını, telefonlarını və ünvanlarını göstərir.\n' +
      'ADMIN_PASS mühit dəyişənini təyin edin və yenidən başladın.',
  )
  process.exit(1)
}

/**
 * The admin page carries one inline script. Hashing it keeps the panel under
 * the same script-src as the rest of the site instead of opening the door with
 * 'unsafe-inline'.
 */
const adminHtml = readFileSync(join(here, 'public', 'admin.html'), 'utf8')
const adminScriptHash = `'sha256-${createHash('sha256')
  .update(adminHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '', 'utf8')
  .digest('base64')}'`

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // React writes style attributes (the blend colour bands, the progress bar)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // the favicon, the select arrow and the film grain are all data: URIs
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

/**
 * Express 4 does not catch a rejected promise from a handler — it would hang the
 * request instead. Every async route goes through this.
 */
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const app = express()
app.disable('x-powered-by')
app.set('trust proxy', Number(TRUST_PROXY) || TRUST_PROXY === 'true')
app.use(compression())

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  next()
})

// only the API takes a body; the static routes have no use for a JSON parser
app.use('/api', express.json({ limit: '48kb' }))

// ------------------------------------------------------------------ validation

const PHONE = /^[0-9+()\s-]{7,20}$/

function fail(res, status, xeta, sahələr) {
  return res.status(status).json(sahələr ? { xeta, sahələr } : { xeta })
}

function cleanText(v, max) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

/** Returns { musteri, setirler } or throws a string describing the first problem. */
function parseOrder(body) {
  if (!body || typeof body !== 'object') throw { xeta: 'Sifariş məlumatı yoxdur.' }

  const m = body.musteri
  if (!m || typeof m !== 'object') throw { xeta: 'Müştəri məlumatı yoxdur.' }

  const sahələr = {}
  const musteri = {
    ad: cleanText(m.ad, 80),
    telefon: cleanText(m.telefon, 24),
    seher: cleanText(m.seher, 40),
    unvan: cleanText(m.unvan, 300),
    qeyd: cleanText(m.qeyd, 400),
    odenis: m.odenis === 'kart' ? 'kart' : 'nagd',
  }
  if (musteri.ad.length < 2) sahələr.ad = 'Adınızı yazın'
  if (!PHONE.test(musteri.telefon)) sahələr.telefon = 'Nömrəni düzgün yazın'
  if (musteri.unvan.length < 6) sahələr.unvan = 'Ünvanı daha ətraflı yazın'
  if (!catalog.cities.includes(musteri.seher)) sahələr.seher = 'Şəhəri siyahıdan seçin'
  if (Object.keys(sahələr).length) throw { xeta: 'Formada düzəliş lazımdır.', sahələr }

  const rows = body.setirler
  if (!Array.isArray(rows) || rows.length === 0) throw { xeta: 'Səbət boşdur.' }
  if (rows.length > 20) throw { xeta: 'Bir sifarişdə ən çox 20 fərqli qarışıq ola bilər.' }

  const setirler = rows.map((row, i) => {
    const where = `${i + 1}-ci qarışıq`
    const say = Number(row?.say)
    if (!Number.isInteger(say) || say < 1 || say > 99)
      throw { xeta: `${where}: say 1 ilə 99 arasında olmalıdır.` }

    const terkib = row?.terkib
    if (!Array.isArray(terkib) || terkib.length === 0)
      throw { xeta: `${where}: tərkib boşdur.` }
    if (terkib.length > catalog.ingredients.length)
      throw { xeta: `${where}: tərkib siyahısı çox uzundur.` }

    const seen = new Set()
    const parsed = terkib.map((t) => {
      const id = typeof t?.id === 'string' ? t.id : ''
      if (!BY_ID.has(id)) throw { xeta: `${where}: «${id}» tanınmır.` }
      if (seen.has(id)) throw { xeta: `${where}: «${BY_ID.get(id).name}» iki dəfə var.` }
      seen.add(id)
      const level = typeof t?.level === 'string' ? t.level : ''
      if (!LEVELS.has(level)) throw { xeta: `${where}: nisbət düzgün deyil.` }
      return { id, level }
    })

    const bases = parsed.filter((t) => isBase(t.id))
    if (bases.length !== 1) throw { xeta: `${where}: tam olaraq bir baza çayı olmalıdır.` }

    // grams and price are recomputed here; whatever the page sent is only
    // compared against, never trusted
    const weighed = weigh(parsed)
    const vahidQiymet = blendPrice(weighed)
    const shown = Number(row?.gosterilenQiymet)
    if (Number.isFinite(shown) && Math.abs(shown - vahidQiymet) > 0.051) {
      throw {
        xeta: 'Qiymətlər yenilənib. Səhifəni yeniləyib yenidən cəhd edin.',
        status: 409,
      }
    }

    return {
      ad: cleanText(row?.ad, 40) || 'Adsız qarışıq',
      say,
      vahidQiymet,
      terkib: weighed,
    }
  })

  return { musteri, setirler }
}

function orderNumber() {
  const d = new Date()
  const stamp =
    String(d.getFullYear() % 100).padStart(2, '0') +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  return `OC-${stamp}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

// ---------------------------------------------------------------------- routes

app.get(
  '/api/health',
  route(async (_req, res) => {
    res.json({ ok: true, sifaris: await totalOrders() })
  }),
)

/** The catalogue the page was built against, for anything wanting live prices. */
app.get('/api/catalog', (_req, res) => {
  res.set('cache-control', 'public, max-age=60')
  res.json(catalog)
})

app.post(
  '/api/orders',
  route(async (req, res) => {
    let parsed
    try {
      parsed = parseOrder(req.body)
    } catch (e) {
      if (e && typeof e === 'object' && 'xeta' in e) {
        return fail(res, e.status ?? 400, e.xeta, e.sahələr)
      }
      return fail(res, 400, 'Sifariş oxunmadı.')
    }

    const ip = String(req.ip ?? 'bilinmir')
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
    if ((await ordersSince(ip, hourAgo)) >= RATE_LIMIT) {
      return fail(res, 429, 'Çox sayda sifariş göndərildi. Bir azdan yenidən cəhd edin.')
    }

    const { musteri, setirler } = parsed
    const cem = roundPrice(setirler.reduce((s, l) => s + l.vahidQiymet * l.say, 0))
    const catdirilma = deliveryFee(cem, musteri.seher)
    const yekun = roundPrice(cem + catdirilma)

    // a collision on the random suffix is rare, but a unique index makes it fatal
    let nomre = ''
    let saved = false
    for (let attempt = 0; attempt < 6 && !saved; attempt++) {
      nomre = orderNumber()
      try {
        await createOrder(
          {
            nomre,
            yaradilib: new Date().toISOString(),
            ...musteri,
            cem,
            catdirilma,
            yekun,
            ip,
          },
          setirler,
        )
        saved = true
      } catch (err) {
        if (!String(err?.message ?? '').includes('UNIQUE')) {
          console.error('[order] yazıla bilmədi:', err)
          return fail(res, 500, 'Sifariş yadda saxlanmadı. Bir azdan yenidən cəhd edin.')
        }
      }
    }
    if (!saved) return fail(res, 500, 'Sifariş nömrəsi yaradıla bilmədi.')

    console.log(`[order] ${nomre} · ${musteri.ad} · ${musteri.seher} · ${yekun} ₼`)
    res.status(201).json({ ok: true, nomre, cem, catdirilma, yekun })
  }),
)

// ----------------------------------------------------------------------- admin

function safeEqual(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization ?? ''
  if (header.startsWith('Basic ')) {
    const [user, ...rest] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':')
    if (safeEqual(user, ADMIN_USER) && safeEqual(rest.join(':'), ADMIN_PASS)) return next()
  }
  // header values must stay ASCII — Node rejects the whole response otherwise,
  // and the browser then never gets the 401 that makes it show a login box
  res.set('WWW-Authenticate', 'Basic realm="oz-cayin admin", charset="UTF-8"')
  res.status(401).type('text/plain; charset=utf-8').send('Giriş tələb olunur.')
}

app.get(
  '/api/admin/orders',
  requireAdmin,
  route(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    const status = STATUSES.includes(String(req.query.status)) ? String(req.query.status) : null
    // independent queries, so they go out together rather than one after the other
    const [cem, sifarisler] = await Promise.all([
      totalOrders(),
      listOrders({ limit, offset, status }),
    ])
    res.json({ cem, statuslar: STATUSES, sifarisler })
  }),
)

app.patch(
  '/api/admin/orders/:id',
  requireAdmin,
  route(async (req, res) => {
    const id = Number(req.params.id)
    const status = String(req.body?.status ?? '')
    if (!Number.isInteger(id)) return fail(res, 400, 'id düzgün deyil.')
    if (!(await setStatus(id, status))) return fail(res, 400, 'Status dəyişdirilmədi.')
    res.json({ ok: true })
  }),
)

app.get('/admin', requireAdmin, (_req, res) => {
  res.setHeader('Content-Security-Policy', CSP.replace("script-src 'self'", `script-src ${adminScriptHash}`))
  res.setHeader('Cache-Control', 'no-store')
  res.type('html').send(adminHtml)
})

// ---------------------------------------------------------------------- static

const dist = join(root, 'dist')
if (!process.env.VERCEL && existsSync(dist)) {
  app.use(
    express.static(dist, {
      index: false,
      setHeaders(res, filePath) {
        // vite fingerprints everything under assets/, so those never go stale
        if (filePath.includes(`${sep}assets${sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else {
          res.setHeader('Cache-Control', 'no-cache')
        }
      },
    }),
  )
  const html = (res, file) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(join(dist, file))
  }
  app.get(/^\/(?!api|admin).*/, (_req, res) => html(res, 'index.html'))
} else {
  app.get('/', (_req, res) =>
    res
      .status(200)
      .type('text/plain; charset=utf-8')
      .send('Backend işləyir. Frontend üçün `npm run dev` (vite) və ya `npm run build`.'),
  )
}

// an unknown /api path should answer as an API, not with the page shell
app.use('/api', (_req, res) => fail(res, 404, 'Belə bir API ünvanı yoxdur.'))

// last resort: log the detail, tell the client nothing about the internals
app.use((err, _req, res, _next) => {
  console.error(err)
  if (res.headersSent) return
  fail(res, 500, 'Serverdə xəta baş verdi.')
})

