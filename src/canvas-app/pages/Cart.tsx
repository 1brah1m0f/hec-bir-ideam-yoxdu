import { Counter, Reveal } from '../components/Reveal'
import { Footer } from '../sections/Footer'
import { BY_ID } from '../../shared/data/ingredients'
import { formatGrams, rgb } from '../../shared/lib/blend'
import { DELIVERY, manat, subtotal } from '../../shared/lib/pricing'
import { Link, ROUTES } from '../lib/router'
import type { CartLine } from '../../shared/types'

interface Props {
  lines: CartLine[]
  onQty: (id: string, qty: number) => void
  onRemove: (id: string) => void
}

export function Cart({ lines, onQty, onRemove }: Props) {
  const sub = subtotal(lines)
  const toFree = Math.max(0, DELIVERY.freeOver - sub)

  return (
    <>
      <main className="mx-auto min-h-[70svh] max-w-5xl px-6 pb-24 pt-32 sm:px-10">
        <Reveal kind="fade">
          <span className="eyebrow">Səbət</span>
        </Reveal>
        <Reveal kind="up" delay={70}>
          <h1 className="mt-4 font-serif text-[clamp(2.1rem,5vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-cream">
            {lines.length === 0
              ? 'Səbət boşdur'
              : `${lines.length} qarışıq səbətdə`}
          </h1>
        </Reveal>

        {lines.length === 0 ? (
          <Reveal kind="up" delay={140}>
            <div className="mt-10 rounded-[3px] border border-dashed border-cream/12 px-6 py-16 text-center">
              <p className="font-serif text-[1.05rem] font-light italic text-cream/40">
                Hələ heç bir qarışıq əlavə etməmisən.
              </p>
              <Link to={ROUTES.mix} className="btn btn-gold mt-7">
                Qarışıq düzəlt
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <Reveal kind="up" delay={120}>
              <ul className="space-y-3">
                {lines.map((l) => (
                  <li
                    key={l.id}
                    className="panel flex flex-wrap items-start gap-5 rounded-[3px] p-5 sm:flex-nowrap"
                  >
                    {/* the blend's own colours, as a stack of bands */}
                    <span
                      aria-hidden="true"
                      className="flex h-16 w-3 shrink-0 flex-col overflow-hidden rounded-full"
                    >
                      {l.items.map((it) => (
                        <span
                          key={it.ingredientId}
                          style={{
                            flexGrow: it.grams,
                            backgroundColor: rgb(BY_ID[it.ingredientId]?.color ?? [90, 60, 40]),
                          }}
                        />
                      ))}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-[1.25rem] font-light leading-tight text-cream">
                        {l.name}
                      </h2>
                      <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/40">
                        {l.items
                          .map((i) => `${BY_ID[i.ingredientId]?.name} ${formatGrams(i.grams)} q`)
                          .join(' · ')}
                      </p>
                      <p className="mt-1.5 font-sans text-[11.5px] text-cream/28">
                        {l.grams} q bağlama · {manat(l.unitPrice)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="flex items-center overflow-hidden rounded-[3px] border border-cream/12">
                        <button
                          type="button"
                          onClick={() => onQty(l.id, l.qty - 1)}
                          aria-label={`${l.name} sayını azalt`}
                          className="px-3 py-1.5 font-sans text-cream/60 transition-colors hover:bg-cream/[0.06] hover:text-cream"
                        >
                          −
                        </button>
                        <span className="min-w-[2.2ch] px-1 text-center font-sans text-[13.5px] tabular-nums text-cream">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onQty(l.id, l.qty + 1)}
                          aria-label={`${l.name} sayını artır`}
                          className="px-3 py-1.5 font-sans text-cream/60 transition-colors hover:bg-cream/[0.06] hover:text-cream"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-20 text-right font-serif text-[1.15rem] font-light tabular-nums text-cream">
                        {manat(l.unitPrice * l.qty)}
                      </span>

                      <button
                        type="button"
                        onClick={() => onRemove(l.id)}
                        aria-label={`${l.name} sil`}
                        className="rounded p-1 text-cream/25 transition-colors hover:text-copper-400"
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
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                to={ROUTES.mix}
                className="btn btn-quiet mt-5 inline-flex"
              >
                + Başqa bir qarışıq əlavə et
              </Link>
            </Reveal>

            <Reveal kind="up" delay={200}>
              <div className="panel rounded-[3px] p-5 lg:sticky lg:top-24">
                <h2 className="font-sans text-[11px] tracking-[0.2em] text-cream/40">YEKUN</h2>

                <div className="mt-4 flex items-baseline justify-between">
                  <span className="font-sans text-[13px] text-cream/55">Məhsullar</span>
                  <span className="font-serif text-[1.8rem] font-light text-brass-400 tabular-nums">
                    <Counter value={sub} decimals={2} />
                    <span className="ml-1 text-[1rem] text-brass-400/70">₼</span>
                  </span>
                </div>

                <p className="mt-3 font-sans text-[11.5px] leading-relaxed text-cream/35">
                  Çatdırılma haqqı növbəti addımda, şəhəri seçəndən sonra hesablanır.
                </p>

                {toFree > 0 ? (
                  <div className="mt-4">
                    <div className="h-1 overflow-hidden rounded-full bg-cream/[0.08]">
                      <div
                        className="h-full rounded-full bg-brass-500/80 transition-[width] duration-700 [transition-timing-function:var(--ease)]"
                        style={{ width: `${Math.min(100, (sub / DELIVERY.freeOver) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 font-sans text-[11.5px] text-brass-400/75">
                      Daha {manat(toFree)} — çatdırılma pulsuz olsun.
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 font-sans text-[11.5px] text-brass-400/75">
                    Çatdırılma pulsuzdur ✓
                  </p>
                )}

                <Link to={ROUTES.pay} className="btn btn-gold mt-6 w-full">
                  Sifarişə keç
                </Link>
              </div>
            </Reveal>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
