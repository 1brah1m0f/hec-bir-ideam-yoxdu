import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The same catalog.json the page imports. Reading it here rather than keeping a
 * second copy is the whole reason a price can never differ between what the
 * customer was shown and what the order is written down at.
 *
 * The arithmetic below is a deliberate mirror of src/shared/lib/pricing.ts — two
 * runtimes, one formula. Any change there has to be made here too, which is why
 * both files round in exactly the same order.
 */

const here = dirname(fileURLToPath(import.meta.url))
const raw = readFileSync(join(here, '..', 'src', 'shared', 'data', 'catalog.json'), 'utf8')

export const catalog = JSON.parse(raw)

export const BY_ID = new Map(catalog.ingredients.map((i) => [i.id, i]))
export const LEVELS = new Set(['az', 'orta', 'cox'])
export const UNITS = { az: 1, orta: 2, cox: 3 }
/** package sizes a blend can be ordered in, grams */
export const PACKAGE_SIZES = catalog.packageSizes
export const DEFAULT_SIZE = PACKAGE_SIZES[0]

const SHARE_AT_100 = {
  keklikotu: { az: 5, orta: 10, cox: 16 },
  nane: { az: 3, orta: 6, cox: 9 },
  cobanyastigi: { az: 4, orta: 7, cox: 10 },
  melissa: { az: 3, orta: 5, cox: 8 },
  lavanda: { az: 0.5, orta: 1, cox: 2 },
  'dag-cayi': { az: 5, orta: 10, cox: 16 },
  alma: { az: 6, orta: 12, cox: 18 },
  zogal: { az: 5, orta: 10, cox: 16 },
  itburnu: { az: 5, orta: 10, cox: 16 },
  'portagal-qabigi': { az: 4, orta: 8, cox: 12 },
  darcin: { az: 1, orta: 2, cox: 4 },
  zencefil: { az: 2, orta: 3, cox: 5 },
  hil: { az: 0.5, orta: 1, cox: 2 },
  mixek: { az: 0.3, orta: 0.7, cox: 1.2 },
}

const CATEGORY_SHARE = {
  ot: { az: 5, orta: 10, cox: 16 },
  meyve: { az: 6, orta: 12, cox: 18 },
  edviyyat: { az: 1.5, orta: 3, cox: 6 },
}

const CATEGORY_CAP = { ot: 0.2, meyve: 0.25, edviyyat: 0.08 }
const STRONG = new Set(['mixek', 'hil', 'lavanda'])
const STRONG_CAP = 0.03
const ADDITION_CAP = 0.4
const BASE_FLOOR = 0.6

function roundTenths(n) {
  return Math.round(n * 10) / 10
}

function targetAt100(id, level) {
  if (SHARE_AT_100[id]) return SHARE_AT_100[id][level]
  const cat = BY_ID.get(id)?.category
  if (cat && cat !== 'baza') return CATEGORY_SHARE[cat][level]
  return 8
}

function capGroup(rows, ids, cap) {
  let sum = 0
  for (const r of rows) if (ids.has(r.id)) sum += r.grams
  if (sum <= cap || sum === 0) return
  const k = cap / sum
  for (const r of rows) if (ids.has(r.id)) r.grams *= k
}

export function roundPrice(n) {
  return Math.round(n * 10) / 10
}

export function isBase(id) {
  return BY_ID.get(id)?.category === 'baza'
}

export function packagingFee(size) {
  return catalog.packaging[String(size)] ?? catalog.packaging[String(DEFAULT_SIZE)]
}

/** Grams the server would assign to this recipe for one package of `total` grams. */
export function weigh(terkib, total = DEFAULT_SIZE) {
  if (!terkib.length) return []

  const adds = terkib.filter((t) => !isBase(t.id))
  const scale = total / catalog.totalGrams

  if (adds.length === 0) {
    return terkib.map((t) => ({ ...t, qram: isBase(t.id) ? total : 0 }))
  }

  const rows = adds.map((t) => ({
    id: t.id,
    grams: targetAt100(t.id, t.level) * scale,
  }))

  for (const cat of ['ot', 'meyve', 'edviyyat']) {
    const ids = new Set(rows.filter((r) => BY_ID.get(r.id)?.category === cat).map((r) => r.id))
    capGroup(rows, ids, CATEGORY_CAP[cat] * total)
  }
  for (const r of rows) {
    if (STRONG.has(r.id)) r.grams = Math.min(r.grams, STRONG_CAP * total)
  }

  let addSum = rows.reduce((s, r) => s + r.grams, 0)
  const maxAdds = ADDITION_CAP * total
  if (addSum > maxAdds && addSum > 0) {
    const k = maxAdds / addSum
    for (const r of rows) r.grams *= k
    addSum = maxAdds
  }

  const minBase = BASE_FLOOR * total
  if (total - addSum < minBase && addSum > 0) {
    const k = (total - minBase) / addSum
    for (const r of rows) r.grams *= k
    addSum = total - minBase
  }

  const byId = new Map(rows.map((r) => [r.id, roundTenths(Math.max(0.1, r.grams))]))
  let used = 0
  const out = terkib.map((t) => {
    if (isBase(t.id)) return { ...t, qram: 0 }
    const qram = byId.get(t.id) ?? 0
    used += qram
    return { ...t, qram }
  })

  const baseRow = out.find((t) => isBase(t.id))
  if (baseRow) baseRow.qram = Math.max(0, roundTenths(total - used))

  const drift = roundTenths(total - out.reduce((s, t) => s + t.qram, 0))
  if (drift !== 0 && baseRow) baseRow.qram = roundTenths(baseRow.qram + drift)

  return out
}

/** Catalogue prices are per 100 g; `weighed` already sums to the package size. */
export function blendPrice(weighed, size = DEFAULT_SIZE) {
  if (weighed.length === 0) return 0
  let sum = 0
  for (const t of weighed) {
    const ing = BY_ID.get(t.id)
    if (ing) sum += (t.qram / catalog.totalGrams) * ing.price
  }
  return roundPrice(sum + packagingFee(size))
}

export function isBakuCity(city) {
  return catalog.bakuCities.includes(city)
}

export function deliveryFee(sub, city) {
  if (sub <= 0) return 0
  if (sub >= catalog.delivery.freeOver) return 0
  return isBakuCity(city) ? catalog.delivery.baku : catalog.delivery.regions
}
