import catalog from './catalog.json'
import type { Category, Ingredient } from '../types'

/**
 * catalog.json is the single source of truth — the Express server reads the same
 * file, so a price can never drift between what the page shows and what the
 * order is charged at.
 */
export const INGREDIENTS = catalog.ingredients as unknown as Ingredient[]

export const CURRENCY = catalog.currency
export const TOTAL_GRAMS = catalog.totalGrams
export const PACKAGING_FEE = catalog.packagingFee
export const DELIVERY = catalog.delivery
export const BAKU_CITIES: string[] = catalog.bakuCities
export const CITIES: string[] = catalog.cities

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: 'baza', label: 'Baza çay', blurb: 'Qarışığın onurğası — biri mütləqdir.' },
  { id: 'ot', label: 'Otlar', blurb: 'Ətir və xarakter. Az miqdar çox şey dəyişir.' },
  { id: 'meyve', label: 'Quru meyvə', blurb: 'Şirinlik, turşuluq və rəng.' },
  { id: 'edviyyat', label: 'Ədviyyat', blurb: 'İstilik. Ehtiyatlı olun — güclüdür.' },
]

export const BY_ID: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
)

export const BASE_IDS = INGREDIENTS.filter((i) => i.category === 'baza').map((i) => i.id)

export function isBase(id: string): boolean {
  return BY_ID[id]?.category === 'baza'
}
