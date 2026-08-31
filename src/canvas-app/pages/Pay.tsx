import { useEffect, useMemo, useState } from 'react'
import { Counter, Reveal } from '../components/Reveal'
import { Footer } from '../sections/Footer'
import { BY_ID, CITIES, DELIVERY } from '../../shared/data/ingredients'
import { manat, totals } from '../../shared/lib/pricing'
import { buildPayload, OrderError, sendOrder } from '../lib/api'
import { Link, navigate, ROUTES } from '../lib/router'
import type { CartLine, Customer, OrderResponse, Payment } from '../../shared/types'

export const LAST_ORDER_KEY = 'oz-cayin.last-order.v1'

interface Props {
  lines: CartLine[]
  onDone: (res: OrderResponse, customer: Customer) => void
}

const EMPTY: Customer = {
  ad: '',
  telefon: '',
  seher: 'Bakı',
  unvan: '',
  qeyd: '',
  odenis: 'nagd',
}

const PAYMENTS: [Payment, string, string][] = [
  ['nagd', 'Nağd', 'Kuryerə çatdırılma zamanı'],
  ['kart', 'Kartla', 'Kuryerin terminalı ilə'],
]

export function Pay({ lines, onDone }: Props) {
  const [c, setC] = useState<Customer>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Customer, string>>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const sum = useMemo(() => totals(lines, c.seher), [lines, c.seher])

  // arriving here with an empty cart is a dead end; send them back to fill it
  useEffect(() => {
    if (lines.length === 0) navigate(ROUTES.cart, { replace: true })
  }, [lines.length])

  function set<K extends keyof Customer>(key: K, value: Customer[K]) {
    setC((prev) => ({ ...prev, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    setFormError('')
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Customer, string>> = {}
    if (c.ad.trim().length < 2) next.ad = 'Adınızı yazın'
    if (!/^[0-9+()\s-]{7,20}$/.test(c.telefon.trim())) next.telefon = 'Nömrəni düzgün yazın'
    if (c.unvan.trim().length < 6) next.unvan = 'Ünvanı daha ətraflı yazın'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || lines.length === 0) return
    if (!validate()) return
    setBusy(true)
    setFormError('')
    try {
      const res = await sendOrder(buildPayload(c, lines))
      onDone(res, c)
      navigate(ROUTES.done, { replace: true })
    } catch (err) {
      if (err instanceof OrderError) {
        setFormError(err.message)
        if (Object.keys(err.fields).length) setErrors((prev) => ({ ...prev, ...err.fields }))
      } else {
        setFormError('Gözlənilməz xəta baş verdi.')
      }
      setBusy(false)
    }
  }

  return (
    <>
      <main className="mx-auto min-h-[70svh] max-w-5xl px-6 pb-24 pt-32 sm:px-10">
        <Reveal kind="fade">
          <span className="eyebrow">Ödəniş və çatdırılma</span>
        </Reveal>
        <Reveal kind="up" delay={70}>
          <h1 className="mt-4 font-serif text-[clamp(2.1rem,5vw,3.2rem)] font-light leading-[1.05] tracking-[-0.015em] text-cream">
            Haraya göndərək?
          </h1>
        </Reveal>
        <Reveal kind="fade" delay={130}>
          <Link
            to={ROUTES.cart}
            className="mt-4 inline-block font-sans text-[12.5px] text-cream/40 transition-colors hover:text-brass-400"
          >
            ← Səbətə qayıt
          </Link>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <Reveal kind="up" delay={120}>
            <form onSubmit={submit} noValidate className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="ad"
                  label="Ad, soyad"
                  value={c.ad}
                  onChange={(v) => set('ad', v)}
                  placeholder="Ayan Səfərova"
                  autoComplete="name"
                  error={errors.ad}
                />
                <Field
                  id="telefon"
                  label="Telefon"
                  value={c.telefon}
                  onChange={(v) => set('telefon', v)}
                  placeholder="+994 50 000 00 00"
                  autoComplete="tel"
                  inputMode="tel"
                  error={errors.telefon}
                />

                <div>
                  <label
                    htmlFor="seher"
                    className="mb-1.5 block font-sans text-[11px] tracking-[0.16em] text-cream/45"
                  >
                    ŞƏHƏR
                  </label>
                  <select
                    id="seher"
                    className="field"
                    value={c.seher}
                    onChange={(e) => set('seher', e.target.value)}
                  >
                    {CITIES.map((city) => (
                      <option key={city} value={city} className="bg-stall-900">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1.5 block font-sans text-[11px] tracking-[0.16em] text-cream/45">
                    ÖDƏNİŞ
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENTS.map(([id, label, hint]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => set('odenis', id)}
                        aria-pressed={c.odenis === id}
                        className={[
                          'rounded-[3px] border px-3 py-2 text-left transition-all duration-500 [transition-timing-function:var(--ease)]',
                          c.odenis === id
                            ? 'border-brass-500/65 bg-brass-500/[0.11] text-cream'
                            : 'border-cream/12 bg-cream/[0.02] text-cream/55 hover:border-cream/25',
                        ].join(' ')}
                      >
                        <span className="block font-sans text-[13px]">{label}</span>
                        <span className="block font-sans text-[10px] text-cream/35">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="unvan"
                  className="mb-1.5 block font-sans text-[11px] tracking-[0.16em] text-cream/45"
                >
                  ÜNVAN
                </label>
                <textarea
                  id="unvan"
                  rows={2}
                  className={`field resize-none ${errors.unvan ? 'field-error' : ''}`}
                  value={c.unvan}
                  onChange={(e) => set('unvan', e.target.value)}
                  placeholder="Küçə, bina, mənzil"
                  autoComplete="street-address"
                />
                {errors.unvan && (
                  <p className="mt-1 font-sans text-[11px] text-copper-400">{errors.unvan}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="qeyd"
                  className="mb-1.5 block font-sans text-[11px] tracking-[0.16em] text-cream/45"
                >
                  QEYD <span className="text-cream/25">(istəyə bağlı)</span>
                </label>
                <textarea
                  id="qeyd"
                  rows={2}
                  className="field resize-none"
                  value={c.qeyd}
                  onChange={(e) => set('qeyd', e.target.value.slice(0, 400))}
                  placeholder="Çatdırılma vaxtı, əlavə istək…"
                />
              </div>

              {formError && (
                <p role="alert" className="font-sans text-[12.5px] text-copper-400">
                  {formError}
                </p>
              )}

              <button type="submit" disabled={busy} className="btn btn-gold w-full sm:w-auto">
                {busy ? 'Göndərilir…' : `Sifarişi təsdiqlə · ${manat(sum.total)}`}
              </button>

              <p className="font-sans text-[11px] leading-relaxed text-cream/25">
                Təsdiqlədikdən sonra çatdırılma vaxtını dəqiqləşdirmək üçün sizə zəng edirik.
                Ödəniş kuryerə təhvil zamanı edilir.
              </p>
            </form>
          </Reveal>

          <Reveal kind="up" delay={200}>
            <div className="panel rounded-[3px] p-5 lg:sticky lg:top-24">
              <h2 className="font-sans text-[11px] tracking-[0.2em] text-cream/40">SİFARİŞ</h2>

              <ul className="mt-4 divide-y divide-cream/[0.07]">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-[15px] font-light text-cream">
                        {l.name} <span className="text-cream/35">× {l.qty}</span>
                      </div>
                      <div className="mt-0.5 truncate font-sans text-[11px] text-cream/32">
                        {l.items.map((i) => BY_ID[i.ingredientId]?.name).join(' · ')}
                      </div>
                    </div>
                    <span className="shrink-0 font-sans text-[13.5px] tabular-nums text-cream/85">
                      {manat(l.unitPrice * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 border-t border-cream/[0.09] pt-4 font-sans text-[13px]">
                <Row label="Məhsullar" value={manat(sum.sub)} />
                <Row
                  label={`Çatdırılma · ${c.seher}`}
                  value={sum.delivery === 0 ? 'pulsuz' : manat(sum.delivery)}
                />
                {sum.toFreeDelivery > 0 && (
                  <p className="pt-1 font-sans text-[11px] leading-relaxed text-brass-400/70">
                    {manat(DELIVERY.freeOver)} üzəri sifarişlərə çatdırılma pulsuzdur.
                  </p>
                )}
                <div className="hairline my-1" />
                <div className="flex items-baseline justify-between">
                  <dt className="font-sans text-[11px] tracking-[0.2em] text-cream/45">YEKUN</dt>
                  <dd className="font-serif text-[1.8rem] font-light text-brass-400 tabular-nums">
                    <Counter value={sum.total} decimals={2} />
                    <span className="ml-1 text-[1rem] text-brass-400/70">₼</span>
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-cream/55">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  autoComplete?: string
  inputMode?: 'tel' | 'text' | 'numeric'
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-sans text-[11px] tracking-[0.16em] text-cream/45"
      >
        {label.toUpperCase()}
      </label>
      <input
        id={id}
        className={`field ${error ? 'field-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
      />
      {error && <p className="mt-1 font-sans text-[11px] text-copper-400">{error}</p>}
    </div>
  )
}
