import { useState } from 'react'
import { useGlassAnchor } from '../components/GlassStage'
import { IngredientPicker } from '../components/IngredientPicker'
import { ProportionList } from '../components/ProportionList'
import { PackageLabel } from '../components/PackageLabel'
import { Segmented } from '../components/Segmented'
import { Counter } from '../components/Reveal'
import { manat, packagingFee } from '../../shared/lib/pricing'
import { BY_ID, PACKAGE_SIZES } from '../../shared/data/ingredients'
import { NAME_SUGGESTIONS, SIZE_COPY } from '../../shared/lib/copy'
import type { Level, WeighedItem } from '../../shared/types'
import type { Mode } from '../canvas/engine'

interface Props {
  items: WeighedItem[]
  selected: Set<string>
  line: string
  master: string | null
  lastBenefit: string | null
  justAdded: string | null
  price: number
  /** price of this same recipe in each pouch size, keyed by grams */
  sizePrices: Record<number, number>
  hasBase: boolean
  name: string
  color: [number, number, number]
  mode: Mode
  size: number
  onMode: (m: Mode) => void
  onSize: (g: number) => void
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
  master,
  lastBenefit,
  justAdded,
  price,
  sizePrices,
  hasBase,
  name,
  color,
  mode,
  size,
  onMode,
  onSize,
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

  const mixing =
    items.length === 0
      ? 'Banka boşdur — əvvəl bir baza seçin'
      : `İndi qarışdırılır: ${items.map((i) => BY_ID[i.ingredientId]?.name).filter(Boolean).join(' + ')}`

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden pt-[57px]">
      <div className="flex min-h-0 flex-1 flex-col wide:flex-row">
        {/* --- the glass half ------------------------------------------------ */}
        <div className="relative h-[38svh] shrink-0 wide:h-auto wide:min-w-0 wide:flex-1">
          <div
            ref={anchor}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 top-16 wide:inset-x-0 wide:bottom-16 wide:top-14"
          />

          <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 wide:left-5 wide:top-5 wide:translate-x-0">
            <Segmented
              value={mode}
              onChange={onMode}
              ariaLabel="Görünüş"
              size="sm"
              options={[
                { id: 'dry', label: 'Quru qarışıq' },
                { id: 'brewed', label: 'Dəmlənmiş' },
              ]}
            />
          </div>

          <p
            aria-live="polite"
            className="pointer-events-none absolute inset-x-4 top-11 text-center font-sans text-[11px] leading-snug tracking-[0.02em] text-cream/55 wide:inset-x-8 wide:top-[3.35rem] wide:text-[12px]"
          >
            {mixing}
          </p>

          <div className="pointer-events-none absolute inset-x-5 bottom-3 hidden wide:block">
            <Insight line={line} master={master} />
          </div>
        </div>

        {/* --- the controls half --------------------------------------------- */}
        <div className="flex min-h-0 flex-1 flex-col border-t border-cream/[0.08] bg-[#0c0805]/78 backdrop-blur-xl wide:w-[46%] wide:max-w-[600px] wide:flex-none wide:border-l wide:border-t-0">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="mb-5 wide:hidden">
              <Insight line={line} master={master} />
            </div>

            {lastBenefit && (
              <p
                key={lastBenefit}
                className="animate-line mb-5 rounded-[3px] border border-brass-500/20 bg-brass-500/[0.07] px-3.5 py-2.5 font-sans text-[12.5px] leading-relaxed text-cream/75"
              >
                {lastBenefit}
              </p>
            )}

            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onSurprise} className="btn btn-quiet">
                Mənə uyğun qarışıq seç
              </button>
              <button
                type="button"
                onClick={onPour}
                disabled={items.length === 0}
                className="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-35"
              >
                {mode === 'brewed' ? 'Qarışdır' : 'Bankanı yenilə'}
              </button>
            </div>

            {items.length >= 5 && (
              <p className="mb-5 font-sans text-[12px] leading-relaxed text-brass-400/80">
                4-dən çox tərkib dadı qarışdıra bilər.
              </p>
            )}

            <Step n="1" title="Dadını seç" hint="Əvvəl bir baza seçin, sonra qarışığa xarakter qatın.">
              <IngredientPicker selected={selected} onToggle={onToggle} justAdded={justAdded} />
            </Step>

            <Step
              n="2"
              title="Dad balansı"
              hint="Seçdiyiniz tərkiblərə görə 100 qramlıq resept avtomatik balanslanır."
            >
              <ProportionList items={items} total={size} onLevel={onLevel} onRemove={onRemove} />
            </Step>

            <Step n="3" title="Ölçü seç" hint="Resept eyni qalır, yalnız bağlamanın çəkisi dəyişir.">
              <Segmented
                value={size}
                onChange={onSize}
                ariaLabel="Bağlama ölçüsü"
                className="w-full"
                options={PACKAGE_SIZES.map((g) => ({
                  id: g,
                  label: `${g} q`,
                  hint: SIZE_COPY[g],
                }))}
              />
              {items.length > 0 && (
                <p className="mt-2.5 font-sans text-[12px] leading-relaxed text-cream/50">
                  {size} q · {SIZE_COPY[size]} · {manat(sizePrices[size] ?? price)}
                </p>
              )}
            </Step>

            <Step n="4" title="Qarışığa ad ver" hint="Bu ad paket etiketində görünəcək.">
              <input
                id="blend-name"
                value={name}
                onChange={(e) => onName(e.target.value.slice(0, 28))}
                placeholder="Məsələn: Axşam sükutu"
                maxLength={28}
                aria-label="Qarışığın adı"
                className="w-full border-b border-cream/15 bg-transparent pb-2 font-serif text-[1.5rem] font-light text-cream outline-none transition-colors duration-500 placeholder:text-cream/25 focus:border-brass-500"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {NAME_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onName(s)}
                    className={[
                      'rounded-full border px-3 py-1 font-sans text-[11.5px] transition-colors duration-300',
                      name === s
                        ? 'border-brass-500/70 bg-brass-500/15 text-cream'
                        : 'border-cream/12 text-cream/55 hover:border-cream/30 hover:text-cream',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 text-right font-sans text-[10.5px] tabular-nums text-cream/30">
                {name.length}/28
              </div>
              <div className="mt-6">
                <p className="mb-3 text-center font-sans text-[12px] tracking-[0.16em] text-brass-400/80">
                  ETİKETDƏ BELƏ GÖRÜNƏCƏK
                </p>
                <PackageLabel name={name} items={items} price={price} size={size} color={color} />
              </div>
            </Step>

            <p className="mt-10 rounded-[3px] border border-cream/[0.08] bg-cream/[0.03] px-3.5 py-3 font-sans text-[12px] leading-relaxed text-cream/50">
              Qeyd: Bitki qarışıqları dərman deyil. Hamiləlik dövründə və ya müntəzəm dərman
              qəbul edirsinizsə, sifarişdən əvvəl həkiminizlə məsləhətləşin.
            </p>
          </div>

          {/* --- the bar that never scrolls away ----------------------------- */}
          <div className="shrink-0 border-t border-cream/[0.12] bg-[#0c0805]/95 px-6 py-3.5 sm:px-8">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="truncate font-sans text-[10.5px] tracking-[0.12em] text-cream/50 sm:text-[11px]">
                  {items.length} tərkib · {size} q · qablaşdırma {manat(packagingFee(size))}
                </div>
                <div className="truncate font-sans text-[12.5px] text-cream/70">
                  {size} qram fərdi qarışıq
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
                className="btn btn-gold min-w-0 max-w-[58%] !px-3 !text-[12.5px] leading-snug sm:max-w-none sm:!px-6 sm:!text-[13px]"
              >
                {added ? 'Səbətdə ✓' : 'Qarışığı səbətə əlavə et'}
              </button>
            </div>
            {!hasBase && (
              <p className="mt-2 font-sans text-[12px] text-copper-400/90">
                Davam etmək üçün bir baza çayı seçin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Insight({ line, master }: { line: string; master: string | null }) {
  return (
    <div className="rounded-[3px] border border-cream/[0.08] bg-[#0c0805]/70 px-4 py-3 backdrop-blur-md">
      <p className="font-serif text-[14.5px] font-light italic leading-relaxed text-cream/70">
        <span key={line} className="animate-line inline-block">
          {line}
        </span>
      </p>
      {master && (
        <p className="mt-2 border-t border-cream/[0.07] pt-2 font-sans text-[11.5px] leading-relaxed text-cream/50">
          <span className="mr-2 tracking-[0.16em] text-brass-400/75">ÇAY USTASI QEYDİ</span>
          {master}
        </p>
      )}
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
        <span className="font-sans text-[11px] tracking-[0.24em] text-brass-500/70">{n}</span>
        <h2 className="font-serif text-[1.2rem] font-light text-cream">{title}</h2>
      </div>
      <p className="mb-3.5 font-sans text-[12.5px] leading-relaxed text-cream/50">{hint}</p>
      {children}
    </section>
  )
}
