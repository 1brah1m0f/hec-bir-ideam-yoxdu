import { useEffect, useState } from 'react'
import { Footer } from '../sections/Footer'
import { manat } from '../../shared/lib/pricing'
import { Link, navigate, ROUTES } from '../lib/router'
import { LAST_ORDER_KEY } from './Pay'
import type { Customer, OrderResponse } from '../../shared/types'

export interface Receipt {
  order: OrderResponse
  customer: Customer
}

export function readReceipt(): Receipt | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.order?.nomre ? (parsed as Receipt) : null
  } catch {
    return null
  }
}

export function writeReceipt(r: Receipt) {
  try {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(r))
  } catch {
    /* private mode — the page still shows the receipt it was handed in memory */
  }
}

export function Done({ receipt }: { receipt: Receipt | null }) {
  // a reload keeps the receipt because it also lives in sessionStorage; opening
  // /hazir cold, with nothing to show, goes back to the top of the site
  const [shown] = useState(() => receipt ?? readReceipt())

  useEffect(() => {
    if (!shown) navigate(ROUTES.landing, { replace: true })
  }, [shown])

  if (!shown) return null
  const { order, customer } = shown
  const firstName = customer.ad.trim().split(' ')[0]

  return (
    <>
      <main className="mx-auto flex min-h-[78svh] max-w-2xl flex-col justify-center px-6 py-32 sm:px-10">
        <div className="panel animate-rise rounded-[3px] px-7 py-12 text-center">
          <div className="eyebrow">Sifariş qeydə alındı</div>

          <div className="mt-5 font-serif text-[clamp(2.2rem,7vw,3.4rem)] font-light leading-none text-brass-400">
            {order.nomre}
          </div>
          <div className="hairline mx-auto mt-7 w-40" />

          <p className="mx-auto mt-7 max-w-md font-serif text-[1.02rem] font-light leading-relaxed text-cream/60">
            {firstName}, sifarişiniz qeydə alındı. Çatdırılma vaxtını dəqiqləşdirmək üçün{' '}
            {customer.telefon} nömrəsinə zəng edəcəyik.
          </p>

          <dl className="mx-auto mt-8 max-w-xs space-y-2 font-sans text-[13px]">
            <div className="flex justify-between text-cream/55">
              <dt>Məhsullar</dt>
              <dd className="tabular-nums">{manat(order.cem)}</dd>
            </div>
            <div className="flex justify-between text-cream/55">
              <dt>Çatdırılma · {customer.seher}</dt>
              <dd className="tabular-nums">
                {order.catdirilma === 0 ? 'pulsuz' : manat(order.catdirilma)}
              </dd>
            </div>
            <div className="hairline my-2" />
            <div className="flex justify-between text-[15px] text-cream">
              <dt>Yekun</dt>
              <dd className="tabular-nums text-brass-400">{manat(order.yekun)}</dd>
            </div>
          </dl>

          <p className="mx-auto mt-7 max-w-sm font-sans text-[11.5px] leading-relaxed text-cream/30">
            Ödəniş {customer.odenis === 'kart' ? 'kartla, kuryerin terminalı ilə' : 'nağd, kuryerə'}{' '}
            ediləcək. Hazırlanma 1–2 iş günü çəkir.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to={ROUTES.mix} className="btn btn-gold">
              Yeni qarışıq düzəlt
            </Link>
            <Link to={ROUTES.landing} className="btn btn-ghost">
              Ana səhifə
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
