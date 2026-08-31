import { useState } from 'react'
import { useGlassAnchor } from '../components/GlassStage'
import { IngredientPicker } from '../components/IngredientPicker'
import { ProportionList } from '../components/ProportionList'
import { PackageLabel } from '../components/PackageLabel'
import { Counter } from '../components/Reveal'
import { manat, PACKAGING_FEE } from '../../shared/lib/pricing'
import type { Level, WeighedItem } from '../../shared/types'
import type { Mode } from '../canvas/engine'

interface Props {
  items: WeighedItem[]
  selected: Set<string>
  line: string
  price: number
  hasBase: boolean
  name: string
  color: [number, number, number]
  mode: Mode
  onMode: (m: Mode) => void
  onName: (v: string) => void
  onToggle: (id: string) => void
  onLevel: (id: string, level: Level) => void
  onRemove: (id: string) => void
  onSurprise: () => void
  onPour: () => void
  onAdd: () => void
}

/**
 * One screen, no page scroll: the glass is pinned in its own half and only the
 * controls column scrolls. Nothing the glass sits in ever moves, so it cannot
 * drift or jump while the recipe is being edited.
 */
export function Mix({
  items,
  selected,
  line,
  price,
  hasBase,
  name,
  color,
  mode,
  onMode,
  onName,
  onToggle,
  onLevel,
  onRemove,
  onSurprise,
  onPour,
  onAdd,
}: Props) {
  const anchor = useGlassAnchor('mix', 0.94)
  const [added, setAdded] = useState(false)

  function add() {
    if (!hasBase) return
    onAdd()
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden pt-[57px]">
      <div className="flex min-h-0 flex-1 flex-col wide:flex-row">
        {/* --- the glass half ------------------------------------------------ */}
        <div className="relative h-[38svh] shrink-0 wide:h-auto wide:min-w-0 wide:flex-1">
          {/* the toggle sits over the jar; on narrow screens the anchor starts
              below it so the lid is never covered */}
          <div
            ref={anchor}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 top-10 wide:inset-0"
          />

          <div className="absolute left-1/2 top-2 -translate-x-1/2 wide:left-5 wide:top-5 wide:translate-x-0">
            <ModeToggle value={mode} onChange={onMode} />
          </div>

          <p
            aria-live="polite"
            className="pointer-events-none absolute inset-x-6 bottom-5 hidden text-center font-serif text-[15.5px] font-light italic leading-relaxed text-cream/60 wide:block"
          >
            {line}
          </p>
        </div>

        {/* --- the controls half --------------------------------------------- */}
        <div className="flex min-h-0 flex-1 flex-col border-t border-cream/[0.08] bg-[#0c0805]/78 backdrop-blur-xl wide:w-[46%] wide:max-w-[600px] wide:flex-none wide:border-l wide:border-t-0">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <p
              aria-live="polite"
              className="mb-6 border-y border-cream/[0.08] py-3 text-center font-serif text-[14.5px] font-light italic leading-relaxed text-cream/60 wide:hidden"
            >
              {line}
            </p>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onSurprise} className="btn btn-quiet">
                Mənim üçün sən seç
              </button>
              <button
                type="button"
                onClick={onPour}
                disabled={items.length === 0}
                className="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-35"
              >
                {mode === 'brewed' ? 'Qarışdır' : 'Yenidən tök'}
              </button>
            </div>

            <Step n="1" title="Tərkib" hint="Bir baza çayı mütləqdir">
              <IngredientPicker selected={selected} onToggle={onToggle} />
            </Step>

            <Step n="2" title="Nisbət" hint="Yüz qram öz-özünə bölünür">
              <ProportionList items={items} onLevel={onLevel} onRemove={onRemove} />
            </Step>

            <Step n="3" title="Ad" hint="Etiketdə bu yazılacaq">
              <input
                id="blend-name"
                value={name}
                onChange={(e) => onName(e.target.value.slice(0, 28))}
                placeholder="Məsələn: Axşam sükutu"
                maxLength={28}
                aria-label="Qarışığın adı"
                className="w-full border-b border-cream/15 bg-transparent pb-2 font-serif text-[1.5rem] font-light text-cream outline-none transition-colors duration-500 placeholder:text-cream/20 focus:border-brass-500"
              />
              <div className="mt-1.5 text-right font-sans text-[10.5px] tabular-nums text-cream/25">
                {name.length}/28
              </div>
              <div className="mt-6">
                <PackageLabel name={name} items={items} price={price} color={color} />
              </div>
            </Step>

            <p className="mt-10 font-sans text-[11px] leading-relaxed text-cream/25">
              Hamiləlik dövründə və ya müntəzəm dərman qəbul edirsinizsə, sifarişdən əvvəl
              həkiminizlə məsləhətləşin.
            </p>
          </div>

          {/* --- the bar that never scrolls away ----------------------------- */}
          <div className="shrink-0 border-t border-cream/[0.09] bg-[#0c0805]/92 px-6 py-3.5 sm:px-8">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="truncate font-sans text-[9.5px] tracking-[0.14em] text-cream/35 sm:text-[10.5px] sm:tracking-[0.18em]">
                  100 QRAM · QABLAŞDIRMA {manat(PACKAGING_FEE)}
                </div>
                <div className="font-serif text-[1.75rem] font-light leading-tight text-brass-400 tabular-nums">
                  <Counter value={price} decimals={2} />
                  <span className="ml-1 text-[0.95rem] text-brass-400/70">₼</span>
                </div>
              </div>
              <button
                type="button"
                onClick={add}
                disabled={!hasBase}
                className="btn btn-gold shrink-0"
              >
                {added ? 'Səbətdə ✓' : 'Səbətə at'}
              </button>
            </div>
            {!hasBase && (
              <p className="mt-2 font-sans text-[11px] text-copper-400/80">
                Davam etmək üçün bir baza çayı seçin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Dry blend in the closed jar, or the same blend brewed with the lid off. */
function ModeToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const options: [Mode, string][] = [
    ['dry', 'Quru qarışıq'],
    ['brewed', 'Dəmlənmiş'],
  ]
  return (
    <div
      role="group"
      aria-label="Görünüş"
      className="flex overflow-hidden rounded-full border border-cream/12 bg-[#0d0906]/70 p-0.5 backdrop-blur-md"
    >
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={[
            'whitespace-nowrap rounded-full px-3 py-1 font-sans text-[11px] transition-all duration-500 [transition-timing-function:var(--ease)] sm:px-4 sm:py-1.5 sm:text-[12px]',
            value === id
              ? 'bg-brass-500/90 text-stall-950'
              : 'text-cream/55 hover:text-cream',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: string
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-9 last:mb-0">
      <div className="mb-3.5 flex items-baseline gap-3">
        <span className="font-sans text-[11px] tracking-[0.24em] text-brass-500/60">{n}</span>
        <h2 className="font-serif text-[1.2rem] font-light text-cream">{title}</h2>
        <span className="ml-auto font-sans text-[11px] text-cream/25">{hint}</span>
      </div>
      {children}
    </section>
  )
}
