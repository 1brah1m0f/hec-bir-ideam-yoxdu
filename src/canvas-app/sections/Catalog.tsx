import { Reveal } from '../components/Reveal'
import { IngredientGlyph } from '../components/IngredientGlyph'
import { CATEGORIES, INGREDIENTS } from '../../shared/data/ingredients'
import { manat } from '../../shared/lib/pricing'

interface Props {
  selected: Set<string>
  /** adds the ingredient to the blend and moves on to the mixer */
  onPick: (id: string) => void
  onStart: () => void
}

export function Catalog({ selected, onPick, onStart }: Props) {
  return (
    <section id="terkib" className="relative py-[12vh]">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-md">
            <Reveal kind="fade">
              <span className="eyebrow">Tərkib</span>
            </Reveal>
            <Reveal kind="up" delay={80}>
              <h2 className="mt-4 font-serif text-[clamp(2rem,4.6vw,3.1rem)] font-light leading-[1.05] tracking-[-0.015em] text-cream">
                On yeddi tərkib
              </h2>
            </Reveal>
          </div>
          <Reveal kind="up" delay={160}>
            <p className="max-w-xs font-sans text-[13px] leading-relaxed text-cream/40">
              Qiymətlər 100 qram üçündür. Qarışığın son qiyməti tərkiblərin nisbətinə görə
              hesablanır. Bir kartın üstünə bassan, onu qarışığa atıb səni qarışdırıcıya
              aparırıq.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 space-y-14">
          {CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <Reveal kind="fade" className="mb-5 flex items-baseline gap-4">
                <h3 className="font-serif text-[1.35rem] font-light text-cream/90">{cat.label}</h3>
                <span className="font-sans text-[12px] text-cream/30">{cat.blurb}</span>
              </Reveal>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {INGREDIENTS.filter((i) => i.category === cat.id).map((ing, i) => {
                  const active = selected.has(ing.id)
                  return (
                    <Reveal key={ing.id} kind="up" delay={i * 60}>
                      <button
                        type="button"
                        onClick={() => onPick(ing.id)}
                        aria-pressed={active}
                        className={[
                          'group relative flex h-full w-full items-start gap-4 overflow-hidden rounded-[3px] border p-4 text-left transition-all duration-[650ms] [transition-timing-function:var(--ease)] hover:-translate-y-1 active:scale-[0.98] active:duration-150',
                          active
                            ? 'border-brass-500/60 bg-brass-500/[0.09] shadow-[0_18px_44px_-28px_rgba(199,154,75,0.9)]'
                            : 'border-cream/[0.09] bg-[#120c08]/70 backdrop-blur-md hover:border-cream/25 hover:bg-[#1a120c]/80',
                        ].join(' ')}
                      >
                        {/* a soft light sweeping across the card, the same gesture as the gold buttons */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cream/[0.06] to-transparent transition-transform duration-[900ms] [transition-timing-function:var(--ease)] group-hover:translate-x-full"
                        />
                        <span className="relative mt-0.5 shrink-0">
                          <IngredientGlyph
                            shape={ing.shape}
                            size={42}
                            className={
                              active
                                ? 'transition-transform duration-700 group-hover:scale-110'
                                : 'opacity-70 transition-all duration-700 group-hover:scale-110 group-hover:opacity-100'
                            }
                          />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="font-serif text-[1.05rem] leading-tight text-cream">
                              {ing.name}
                            </span>
                            <span className="shrink-0 font-sans text-[11.5px] tabular-nums text-brass-400/85">
                              {manat(ing.price)}
                            </span>
                          </span>
                          <span className="mt-1.5 block font-sans text-[12px] leading-relaxed text-cream/40">
                            {ing.note}
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          className={[
                            'absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-500',
                            active
                              ? 'border-brass-400 bg-brass-500 opacity-100'
                              : 'border-cream/20 opacity-0 group-hover:opacity-100',
                          ].join(' ')}
                        >
                          {active && (
                            <svg width="9" height="7" viewBox="0 0 9 7">
                              <path
                                d="M1 3.6L3.3 6 8 1"
                                fill="none"
                                stroke="#170f08"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    </Reveal>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <Reveal kind="up" className="mt-16">
          <div className="panel flex flex-wrap items-center justify-between gap-6 rounded-[3px] px-7 py-8">
            <div className="max-w-md">
              <h3 className="font-serif text-[1.7rem] font-light leading-tight text-cream">
                Hansını seçəcəyini bilmirsən?
              </h3>
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/45">
                Qarışdırıcıda boş bankadan başla və ya bizə seçdir — nisbəti sonra
                dəyişə bilərsən.
              </p>
            </div>
            <button type="button" onClick={onStart} className="btn btn-gold">
              Qarışdırıcıya keç
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
