import { IngredientGlyph } from '../components/IngredientGlyph'
import { INGREDIENTS } from '../../shared/data/ingredients'

/**
 * A slow, endless ribbon of every ingredient's name and glyph. Purely
 * decorative — it sits between the hero and the rest of the page as a beat of
 * movement before the copy-heavy sections, and repeats the full catalogue
 * twice back to back so the loop at 50% never shows a seam.
 */
export function Marquee() {
  const row = (key: string) => (
    <div key={key} aria-hidden={key === 'b'} className="flex shrink-0 items-center">
      {INGREDIENTS.map((ing, i) => (
        <span key={`${key}-${ing.id}`} className="flex shrink-0 items-center gap-2.5 px-6">
          <IngredientGlyph shape={ing.shape} size={22} className="opacity-60" />
          <span className="whitespace-nowrap font-serif text-[15px] font-light italic text-cream/45">
            {ing.name}
          </span>
          <span
            aria-hidden="true"
            className="ml-3.5 h-[3px] w-[3px] rounded-full bg-brass-500/40"
          />
        </span>
      ))}
    </div>
  )

  return (
    <div
      role="presentation"
      className="relative overflow-hidden border-y border-cream/[0.07] bg-[#0a0705]/60 py-4"
    >
      {/* fades the strip into the background at both edges instead of a hard cut */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0d0906] to-transparent sm:w-28"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0d0906] to-transparent sm:w-28"
      />
      <div className="animate-drift flex w-max">
        {row('a')}
        {row('b')}
      </div>
    </div>
  )
}
