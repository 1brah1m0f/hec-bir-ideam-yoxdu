import { useEffect } from 'react'
import { CATEGORIES, INGREDIENTS } from '../../shared/data/ingredients'
import { useGlass } from './GlassStage'
import { manat } from '../../shared/lib/pricing'
import { IngredientGlyph } from './IngredientGlyph'

interface Props {
  selected: Set<string>
  onToggle: (id: string) => void
}

export function IngredientPicker({ selected, onToggle }: Props) {
  const { highlight } = useGlass()

  // navigating away mid-hover would otherwise leave the jar dimmed
  useEffect(() => () => highlight(null), [highlight])

  return (
    <div className="space-y-7">
      {CATEGORIES.map((cat) => (
        <section key={cat.id} aria-label={cat.label}>
          <h3 className="mb-3 font-sans text-[11px] tracking-[0.2em] text-cream/40">
            {cat.label.toUpperCase()}
          </h3>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {INGREDIENTS.filter((i) => i.category === cat.id).map((ing) => {
              const active = selected.has(ing.id)
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
                    'group relative flex flex-col items-center gap-1 overflow-hidden rounded-[3px] border px-2 py-3 text-center transition-all duration-500 [transition-timing-function:var(--ease)] hover:-translate-y-0.5',
                    active
                      ? 'border-brass-500/65 bg-brass-500/[0.11] text-cream shadow-[0_14px_34px_-24px_rgba(199,154,75,0.95)]'
                      : 'border-cream/[0.09] bg-cream/[0.02] text-cream/70 hover:border-cream/25 hover:bg-cream/[0.05]',
                  ].join(' ')}
                >
                  <IngredientGlyph
                    shape={ing.shape}
                    size={36}
                    className={[
                      'transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:scale-110',
                      active ? '' : 'opacity-65 group-hover:opacity-95',
                    ].join(' ')}
                  />
                  <span className="font-sans text-[11px] leading-tight">{ing.name}</span>
                  <span
                    className={[
                      'font-sans text-[9.5px] tabular-nums transition-colors',
                      active ? 'text-brass-400/85' : 'text-cream/25 group-hover:text-cream/45',
                    ].join(' ')}
                  >
                    {manat(ing.price)}
                  </span>
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
      ))}
    </div>
  )
}
