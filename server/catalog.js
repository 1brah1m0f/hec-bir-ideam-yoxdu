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

export function roundPrice(n) {
  return Math.round(n * 10) / 10
}

export function isBase(id) {
  return BY_ID.get(id)?.category === 'baza'
}

/** Grams the server would assign to this recipe, independent of what was sent. */
export function weigh(terkib) {
  const totalUnits = terkib.reduce((s, t) => s + UNITS[t.level], 0)
  const out = terkib.map((t) => ({
    ...t,
    qram: Math.round((UNITS[t.level] / totalUnits) * catalog.totalGrams),
  }))

  let remainder = catalog.totalGrams - out.reduce((s, t) => s + t.qram, 0)
  if (remainder === 0) return out

  const order = [
    ...out.filter((t) => isBase(t.id)),
    ...out.filter((t) => !isBase(t.id)).sort((a, b) => b.qram - a.qram),
  ]
  for (const row of order) {
    if (remainder === 0) break
    const next = Math.max(1, row.qram + remainder)
    remainder -= next - row.qram
    row.qram = next
  }
  return out
}

export function blendPrice(weighed) {
  if (weighed.length === 0) return 0
  let sum = 0
  for (const t of weighed) {
    const ing = BY_ID.get(t.id)
    if (ing) sum += (t.qram / catalog.totalGrams) * ing.price
  }
  return roundPrice(sum + catalog.packagingFee)
}

export function isBakuCity(city) {
  return catalog.bakuCities.includes(city)
}

export function deliveryFee(sub, city) {
  if (sub <= 0) return 0
  if (sub >= catalog.delivery.freeOver) return 0
  return isBakuCity(city) ? catalog.delivery.baku : catalog.delivery.regions
}
