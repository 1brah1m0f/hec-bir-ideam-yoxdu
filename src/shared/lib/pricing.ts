import {
  BY_ID,
  DEFAULT_SIZE,
  DELIVERY,
  packagingFee,
  TOTAL_GRAMS,
  BAKU_CITIES,
} from '../data/ingredients'
import type { CartLine, WeighedItem } from '../types'

/** Round to the nearest 10 qəpik — shelf prices here never carry single qəpik. */
export function roundPrice(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * What the leaf itself costs, before packaging. Catalogue prices are per 100 g,
 * so a 250 g pouch of the same recipe is simply two and a half times the leaf.
 */
export function ingredientCost(items: WeighedItem[]): number {
  let sum = 0
  for (const it of items) {
    const ing = BY_ID[it.ingredientId]
    if (ing) sum += (it.grams / TOTAL_GRAMS) * ing.price
  }
  return sum
}

/**
 * Price of one package of this blend, packaging and blending included. `items`
 * must already be weighed out for a package of `size` grams.
 */
export function blendPrice(items: WeighedItem[], size: number = DEFAULT_SIZE): number {
  if (items.length === 0) return 0
  return roundPrice(ingredientCost(items) + packagingFee(size))
}

export function isBaku(city: string): boolean {
  return BAKU_CITIES.includes(city)
}

export function subtotal(lines: CartLine[]): number {
  return roundPrice(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0))
}

export function deliveryFee(sub: number, city: string): number {
  if (sub <= 0) return 0
  if (sub >= DELIVERY.freeOver) return 0
  return isBaku(city) ? DELIVERY.baku : DELIVERY.regions
}

export interface Totals {
  sub: number
  delivery: number
  total: number
  /** how much more is needed for free delivery, 0 once it is reached */
  toFreeDelivery: number
}

export function totals(lines: CartLine[], city: string): Totals {
  const sub = subtotal(lines)
  const delivery = deliveryFee(sub, city)
  return {
    sub,
    delivery,
    total: roundPrice(sub + delivery),
    toFreeDelivery: sub > 0 ? Math.max(0, roundPrice(DELIVERY.freeOver - sub)) : 0,
  }
}

/** "12,40 ₼" — comma decimal separator, the way prices are written here. */
export function manat(n: number, withUnit = true): string {
  const s = n.toFixed(2).replace('.', ',')
  return withUnit ? `${s} ₼` : s
}

export { DELIVERY, packagingFee }
