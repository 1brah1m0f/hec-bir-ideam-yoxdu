import { BY_ID, isBase } from '../../shared/data/ingredients'
import { formatGrams, LEVEL_LABEL, rgb } from '../../shared/lib/blend'
import { DAD_ROLE, LEVEL_HINT } from '../../shared/lib/copy'
import type { Level, WeighedItem } from '../../shared/types'
import { useEffect } from 'react'
import { useGlass } from './GlassStage'

const LEVELS: Level[] = ['az', 'orta', 'cox']

interface Props {
  items: WeighedItem[]
  /** package size in grams the items sum to */
  total: number
  onLevel: (id: string, level: Level) => void
  onRemove: (id: string) => void
}

export function ProportionList({ items, total, onLevel, onRemove }: Props) {
  const { highlight } = useGlass()
  useEffect(() => () => highlight(null), [highlight])

  if (items.length === 0) {
    return (
      <div className="rounded-[3px] border border-dashed border-cream/12 px-5 py-9 text-center">
        <p className="font-serif text-[15px] font-light italic text-cream/45">
          Banka hələ boşdur. Bir baza çayı seçəndə tökülməyə başlayacaq.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-1.5 font-sans text-[11px] tracking-[0.18em] text-cream/50">
        Dad balansı
      </div>
      <div className="mb-1.5 flex h-2 overflow-hidden rounded-full bg-cream/[0.06]">
        {items.map((it) => {
          const ing = BY_ID[it.ingredientId]
          return (
            <span
              key={it.ingredientId}
              title={`${ing?.name} · ${formatGrams(it.grams)} q`}
              style={{
                width: `${(it.grams / total) * 100}%`,
                backgroundColor: ing ? rgb(ing.color) : undefined,
              }}
              className="h-full transition-[width] duration-700 [transition-timing-function:var(--ease)]"
            />
          )
        })}
      </div>
      <div className="mb-4 font-sans text-[10.5px] tracking-[0.14em] text-cream/40">
        Baza gücü · Bitki aroması · Təravət
      </div>

      <ul className="divide-y divide-cream/[0.07]">
        {items.map((it) => {
          const ing = BY_ID[it.ingredientId]
          const base = isBase(it.ingredientId)
          const role = DAD_ROLE[it.ingredientId]
          return (
            <li
              key={it.ingredientId}
              onPointerEnter={() => highlight(it.ingredientId)}
              onPointerLeave={() => highlight(null)}
              className="flex items-center gap-3 py-3 transition-colors duration-300 hover:bg-cream/[0.03] sm:gap-4"
            >
              <span
                aria-hidden="true"
                className="h-6 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: ing ? rgb(ing.color) : undefined }}
              />

              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[13.5px] text-cream">{ing?.name}</div>
                <div className="font-sans text-[10.5px] tracking-[0.08em] text-brass-400/75">
                  {role ?? (base ? 'baza' : '')}
                </div>
              </div>

              {!base ? (
                <div
                  role="group"
                  aria-label={`${ing?.name} nisbəti`}
                  className="flex shrink-0 overflow-hidden rounded-[3px] border border-cream/12"
                >
                  {LEVELS.map((lvl) => {
                    const on = it.level === lvl
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => onLevel(it.ingredientId, lvl)}
                        aria-pressed={on}
                        title={LEVEL_HINT[lvl]}
                        className={[
                          'px-2.5 py-1.5 font-sans text-[11px] transition-colors duration-300 sm:px-3',
                          on
                            ? 'bg-brass-500/90 text-stall-950'
                            : 'text-cream/55 hover:bg-cream/[0.06] hover:text-cream/85',
                        ].join(' ')}
                      >
                        {LEVEL_LABEL[lvl]}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <span className="hidden font-sans text-[10.5px] text-cream/35 sm:block">
                  qalanı baza tutur
                </span>
              )}

              <div className="w-12 shrink-0 text-right font-sans text-[13.5px] tabular-nums text-cream/90">
                {formatGrams(it.grams)} q
              </div>

              {!base ? (
                <button
                  type="button"
                  onClick={() => onRemove(it.ingredientId)}
                  aria-label={`${ing?.name} çıxar`}
                  className="shrink-0 rounded p-1 text-cream/30 transition-colors duration-300 hover:text-copper-400"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M3 3l8 8M11 3l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              ) : (
                <span className="w-[22px] shrink-0" />
              )}
            </li>
          )
        })}
      </ul>

      {!items.every((it) => isBase(it.ingredientId)) && (
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-cream/40">
          Az — {LEVEL_HINT.az}. Orta — {LEVEL_HINT.orta}. Çox — {LEVEL_HINT.cox}.
        </p>
      )}

      <div className="mt-3 flex items-baseline justify-between border-t border-brass-500/25 pt-3">
        <span className="font-sans text-[11px] tracking-[0.2em] text-cream/50">CƏMİ</span>
        <span className="font-serif text-lg font-light text-brass-400">{total} q</span>
      </div>
    </div>
  )
}
