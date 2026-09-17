import { useEffect } from 'react'
import { INGREDIENTS, isBase } from '../../shared/data/ingredients'
import { MIX_CATEGORIES } from '../../shared/lib/copy'
import { useGlass } from './GlassStage'
import { manat } from '../../shared/lib/pricing'
import { IngredientGlyph } from './IngredientGlyph'

interface Props {
  selected: Set<string>
  onToggle: (id: string) => void
  /** the ingredient that was just added — card shows a one-second “əlavə olundu” */
  justAdded?: string | null
}

export function IngredientPicker({ selected, onToggle, justAdded }: Props) {
  const { highlight } = useGlass()
  const hasBase = [...selected].some(isBase)

  useEffect(() => () => highlight(null), [highlight])

  return (
    <div className="space-y-7">
      {!hasBase && (
        <p className="rounded-[3px] border border-brass-500/25 bg-brass-500/[0.07] px-3.5 py-2.5 font-sans text-[12.5px] leading-relaxed text-cream/75">
          Əvvəlcə bir baza seçin. Qarışığın əsas dadı buradan başlayır.
        </p>
      )}

      {MIX_CATEGORIES.map((cat) => {
        const locked = cat.id !== 'baza' && !hasBase
        return (
          <section
            key={cat.id}
            aria-label={cat.label}
            aria-disabled={locked}
            className={locked ? 'pointer-events-none select-none opacity-40' : ''}
          >
            {cat.cue && hasBase && (
              <div className="mb-2 font-sans text-[10.5px] tracking-[0.18em] text-brass-400/80">
                {cat.cue.toUpperCase()}
              </div>
            )}
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <h3 className="font-sans text-[11px] tracking-[0.2em] text-cream/55">
                {cat.label.toUpperCase()}
              </h3>
              <span className="text-right font-sans text-[11px] leading-snug text-cream/40">
                {cat.blurb}
              </span>
            </div>

            <div
              className={
                cat.id === 'baza'
                  ? 'grid grid-cols-3 gap-2'
                  : 'grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4'
              }
            >
              {INGREDIENTS.filter((i) => i.category === cat.id).map((ing) => {
                const active = selected.has(ing.id)
                const flash = justAdded === ing.id
                const base = isBase(ing.id)
                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => onToggle(ing.id)}
                    onPointerEnter={() => highlight(ing.id)}
                    onPointerLeave={() => highlight(null)}
                    onFocus={() => highlight(ing.id)}
                    onBlur={() => highlight(null)}
                    aria-pressed={active}
                    title={ing.note}
                    className={[
                      'group relative flex flex-col items-center overflow-hidden rounded-[3px] border text-center transition-all duration-500 [transition-timing-function:var(--ease)] hover:-translate-y-0.5 active:scale-[0.97]',
                      base ? 'gap-1.5 px-2 py-4' : 'gap-1 px-2 py-3',
                      active
                        ? 'border-brass-500/65 bg-brass-500/[0.11] text-cream shadow-[0_14px_34px_-24px_rgba(199,154,75,0.95)]'
                        : 'border-cream/[0.09] bg-cream/[0.02] text-cream/75 hover:border-cream/25 hover:bg-cream/[0.05]',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cream/[0.08] to-transparent transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:translate-x-full"
                    />
                    <IngredientGlyph
                      shape={ing.shape}
                      size={base ? 44 : 36}
                      className={[
                        'transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:scale-110',
                        active ? '' : 'opacity-65 group-hover:opacity-95',
                      ].join(' ')}
                    />
                    <span
                      className={[
                        'font-sans leading-tight',
                        base ? 'text-[12.5px]' : 'text-[11px]',
                      ].join(' ')}
                    >
                      {ing.name}
                    </span>
                    <span
                      className={[
                        'font-sans text-[9.5px] tabular-nums transition-colors',
                        active ? 'text-brass-400/85' : 'text-cream/35 group-hover:text-cream/55',
                      ].join(' ')}
                    >
                      {manat(ing.price)}
                    </span>
                    {active && (
                      <span className="font-sans text-[9px] tracking-[0.12em] text-brass-400/90">
                        {flash ? 'Əlavə olundu' : 'Seçildi'}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={[
                        'absolute inset-x-0 bottom-0 h-[2px] origin-left bg-brass-500 transition-transform duration-500 [transition-timing-function:var(--ease)]',
                        active ? 'scale-x-100' : 'scale-x-0',
                      ].join(' ')}
                    />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
