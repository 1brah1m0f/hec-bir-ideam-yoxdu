import { useEffect, useState } from 'react'
import { Link, ROUTES } from '../lib/router'

export interface ToastMessage {
  /** changes on every message, so the same text can be shown twice in a row */
  id: number
  title: string
  body?: string
}

/**
 * One line at the bottom of the screen after something lands in the cart. It
 * carries the way to the cart with it, so the header never has to be hunted for.
 */
export function Toast({
  message,
  onDone,
  ttl = 2800,
}: {
  message: ToastMessage | null
  onDone: () => void
  ttl?: number
}) {
  const [shown, setShown] = useState<ToastMessage | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!message) return
    setShown(message)
    setLeaving(false)
    const hide = window.setTimeout(() => setLeaving(true), ttl)
    const gone = window.setTimeout(() => {
      setShown(null)
      onDone()
    }, ttl + 420)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(gone)
    }
  }, [message, ttl, onDone])

  if (!shown) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'toast pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4',
        leaving ? 'is-leaving' : '',
      ].join(' ')}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-brass-500/35 bg-[#15100a]/92 py-2 pl-3.5 pr-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:gap-4 sm:pl-4">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass-500 text-stall-950"
        >
          <svg width="11" height="9" viewBox="0 0 11 9">
            <path
              className="draw-check"
              d="M1.5 4.6L4.2 7.3 9.5 1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-[14.5px] font-light text-cream">
            {shown.title}
          </span>
          {shown.body && (
            <span className="block truncate font-sans text-[11px] text-cream/45">{shown.body}</span>
          )}
        </span>
        <Link to={ROUTES.cart} className="btn btn-gold shrink-0 !rounded-full !px-4 !py-1.5 !text-[12px]">
          Səbətə bax
        </Link>
      </div>
    </div>
  )
}
