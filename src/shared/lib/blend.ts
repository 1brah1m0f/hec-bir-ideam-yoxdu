import { BY_ID, isBase, TOTAL_GRAMS } from '../data/ingredients'
import type { BlendItem, Level, WeighedItem } from '../types'

export { TOTAL_GRAMS }

export const UNITS: Record<Level, number> = { az: 1, orta: 2, cox: 3 }

export const LEVEL_LABEL: Record<Level, string> = { az: 'az', orta: 'orta', cox: 'çox' }

/**
 * Splits one package of `total` grams across the recipe by its az/orta/çox units.
 * Remainder from rounding always lands on the base tea so the sum is exact.
 * If the base would be pushed below 1 g the surplus spills onto the next largest row.
 */
export function weigh(items: BlendItem[], total: number = TOTAL_GRAMS): WeighedItem[] {
  if (items.length === 0) return []

  const totalUnits = items.reduce((sum, it) => sum + UNITS[it.level], 0)
  const weighed: WeighedItem[] = items.map((it) => ({
    ...it,
    grams: Math.round((UNITS[it.level] / totalUnits) * total),
  }))

  let remainder = total - weighed.reduce((sum, it) => sum + it.grams, 0)
  if (remainder === 0) return weighed

  const order = [
    ...weighed.filter((it) => isBase(it.ingredientId)),
    ...weighed
      .filter((it) => !isBase(it.ingredientId))
      .sort((a, b) => b.grams - a.grams),
  ]

  for (const row of order) {
    if (remainder === 0) break
    const next = Math.max(1, row.grams + remainder)
    remainder -= next - row.grams
    row.grams = next
  }

  return weighed
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
  if (isBase(id)) {
    const withoutBase = items.filter((it) => !isBase(it.ingredientId))
    return [{ ingredientId: id, level: 'orta' }, ...withoutBase]
  }
  return [...items, { ingredientId: id, level: 'orta' }]
}

export function removeIngredient(items: BlendItem[], id: string): BlendItem[] {
  if (isBase(id)) return items
  return items.filter((it) => it.ingredientId !== id)
}

export function setLevel(items: BlendItem[], id: string, level: Level): BlendItem[] {
  return items.map((it) => (it.ingredientId === id ? { ...it, level } : it))
}
