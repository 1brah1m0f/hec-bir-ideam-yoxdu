import { BY_ID, isBase, TOTAL_GRAMS } from '../data/ingredients'
import type { BlendItem, Category, Level, WeighedItem } from '../types'

export { TOTAL_GRAMS }

/** Kept for the az/orta/çox control — the weigh function no longer splits by these. */
export const UNITS: Record<Level, number> = { az: 1, orta: 2, cox: 3 }

export const LEVEL_LABEL: Record<Level, string> = { az: 'az', orta: 'orta', cox: 'çox' }

/**
 * How many grams of an addition belong in a 100 g pouch at each level.
 * Strong spices stay in the 0.3–2 g band so they cannot take over the cup.
 */
const SHARE_AT_100: Record<string, Record<Level, number>> = {
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

const CATEGORY_SHARE: Record<Exclude<Category, 'baza'>, Record<Level, number>> = {
  ot: { az: 5, orta: 10, cox: 16 },
  meyve: { az: 6, orta: 12, cox: 18 },
  edviyyat: { az: 1.5, orta: 3, cox: 6 },
}

const CATEGORY_CAP: Record<Exclude<Category, 'baza'>, number> = {
  ot: 0.2,
  meyve: 0.25,
  edviyyat: 0.08,
}

const STRONG = new Set(['mixek', 'hil', 'lavanda'])
const STRONG_CAP = 0.03
const ADDITION_CAP = 0.4
const BASE_FLOOR = 0.6

export function isStrongSpice(id: string): boolean {
  return STRONG.has(id)
}

function roundTenths(n: number): number {
  return Math.round(n * 10) / 10
}

function targetAt100(id: string, level: Level): number {
  if (SHARE_AT_100[id]) return SHARE_AT_100[id][level]
  const cat = BY_ID[id]?.category
  if (cat && cat !== 'baza') return CATEGORY_SHARE[cat][level]
  return 8
}

function capGroup(rows: { id: string; grams: number }[], ids: Set<string>, cap: number) {
  let sum = 0
  for (const r of rows) if (ids.has(r.id)) sum += r.grams
  if (sum <= cap || sum === 0) return
  const k = cap / sum
  for (const r of rows) if (ids.has(r.id)) r.grams *= k
}

/**
 * Splits one package of `total` grams the way a tea recipe does: the base tea
 * holds 60–80 %, additions stay in their own bands, and strong spices never
 * climb above a pinch. Remainder from rounding always lands on the base.
 */
export function weigh(items: BlendItem[], total: number = TOTAL_GRAMS): WeighedItem[] {
  if (items.length === 0) return []

  const adds = items.filter((it) => !isBase(it.ingredientId))
  const scale = total / TOTAL_GRAMS

  if (adds.length === 0) {
    return items.map((it) => ({
      ...it,
      grams: isBase(it.ingredientId) ? total : 0,
    }))
  }

  const rows = adds.map((it) => ({
    id: it.ingredientId,
    grams: targetAt100(it.ingredientId, it.level) * scale,
  }))

  for (const cat of ['ot', 'meyve', 'edviyyat'] as const) {
    const ids = new Set(
      rows.filter((r) => BY_ID[r.id]?.category === cat).map((r) => r.id),
    )
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
  const weighed: WeighedItem[] = items.map((it) => {
    if (isBase(it.ingredientId)) return { ...it, grams: 0 }
    const grams = byId.get(it.ingredientId) ?? 0
    used += grams
    return { ...it, grams }
  })

  const remainder = roundTenths(total - used)
  const baseRow = weighed.find((it) => isBase(it.ingredientId))
  if (baseRow) baseRow.grams = Math.max(0, remainder)

  const drift = roundTenths(total - weighed.reduce((s, it) => s + it.grams, 0))
  if (drift !== 0 && baseRow) baseRow.grams = roundTenths(baseRow.grams + drift)

  return weighed
}

/** "7 q" or "0,3 q" — comma decimals, no trailing zero. */
export function formatGrams(n: number): string {
  const t = roundTenths(n)
  if (Math.abs(t - Math.round(t)) < 0.05) return String(Math.round(t))
  return t.toFixed(1).replace('.', ',')
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** Live weighted mix of every ingredient's tint, weighted by grams × tinting strength. */
export function blendColor(items: WeighedItem[]): [number, number, number] {
  const EMPTY: [number, number, number] = [232, 214, 178]
  if (items.length === 0) return EMPTY

  let r = 0
  let g = 0
  let b = 0
  let w = 0
  for (const it of items) {
    const ing = BY_ID[it.ingredientId]
    if (!ing) continue
    const weight = it.grams * ing.strength
    r += ing.color[0] * weight
    g += ing.color[1] * weight
    b += ing.color[2] * weight
    w += weight
  }
  if (w === 0) return EMPTY
  return [Math.round(r / w), Math.round(g / w), Math.round(b / w)]
}

export function rgb([r, g, b]: [number, number, number], alpha = 1) {
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function shade(
  [r, g, b]: [number, number, number],
  amount: number,
): [number, number, number] {
  if (amount >= 0) {
    return [
      Math.round(r + (255 - r) * clamp01(amount)),
      Math.round(g + (255 - g) * clamp01(amount)),
      Math.round(b + (255 - b) * clamp01(amount)),
    ]
  }
  const k = 1 + Math.max(-1, amount)
  return [Math.round(r * k), Math.round(g * k), Math.round(b * k)]
}

export function addIngredient(items: BlendItem[], id: string): BlendItem[] {
  if (items.some((it) => it.ingredientId === id)) return items
  const level: Level = isBase(id) ? 'orta' : STRONG.has(id) ? 'az' : 'orta'
  if (isBase(id)) {
    const withoutBase = items.filter((it) => !isBase(it.ingredientId))
    return [{ ingredientId: id, level }, ...withoutBase]
  }
  return [...items, { ingredientId: id, level }]
}

export function removeIngredient(items: BlendItem[], id: string): BlendItem[] {
  if (isBase(id)) return items
  return items.filter((it) => it.ingredientId !== id)
}

export function setLevel(items: BlendItem[], id: string, level: Level): BlendItem[] {
  return items.map((it) => (it.ingredientId === id ? { ...it, level } : it))
}
