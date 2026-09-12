import catalog from './catalog.json'
import type { Category, Ingredient } from '../types'

/**
 * catalog.json is the single source of truth — the Express server reads the same
 * file, so a price can never drift between what the page shows and what the
 * order is charged at.
 */
export const INGREDIENTS = catalog.ingredients as unknown as Ingredient[]

export const CURRENCY = catalog.currency
/** the reference weight every recipe is expressed against — prices are per 100 g */
export const TOTAL_GRAMS = catalog.totalGrams
/** package sizes a blend can be ordered in, in grams */
export const PACKAGE_SIZES: number[] = catalog.packageSizes
export const DEFAULT_SIZE = PACKAGE_SIZES[0]
const PACKAGING = catalog.packaging as Record<string, number>
/** ml per gram of a mid blend — what a full jar is calibrated against */
export const REFERENCE_BULK = catalog.referenceBulk
export const DELIVERY = catalog.delivery
export const BAKU_CITIES: string[] = catalog.bakuCities
export const CITIES: string[] = catalog.cities

/** Packaging and blending fee for one pouch of this size. */
export function packagingFee(size: number): number {
  return PACKAGING[String(size)] ?? PACKAGING[String(DEFAULT_SIZE)]
}

export function isPackageSize(n: unknown): n is number {
  return typeof n === 'number' && PACKAGE_SIZES.includes(n)
}

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
