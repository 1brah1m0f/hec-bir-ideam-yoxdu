import { useEffect, useRef, useState } from 'react'
import { Link, ROUTES } from '../lib/router'

const LANDING_NAV = [
  { href: '#hekaye', label: 'Niyə' },
  { href: '#nece', label: 'Necə işləyir' },
  { href: '#terkib', label: 'Dadlar' },
]

interface Props {
  cartCount: number
  route: string
}

export function Header({ cartCount, route }: Props) {
  const [solid, setSolid] = useState(false)
  const [bump, setBump] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const onLanding = route === ROUTES.landing

  useEffect(() => {
    // every page but the landing sits on its own panel, so the bar stays solid
    if (!onLanding) {
      setSolid(true)
      return
    }
    // the progress hairline is written straight to the DOM rather than through
    // state — a value that changes on every scroll tick would otherwise
    // re-render the whole header dozens of times a second
    const onScroll = () => {
      setSolid(window.scrollY > 40)
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${pct})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onLanding])

  // a short pulse whenever something lands in the cart
  useEffect(() => {
    if (cartCount === 0) return
    setBump(true)
    const t = window.setTimeout(() => setBump(false), 640)
    return () => window.clearTimeout(t)
  }, [cartCount])

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-40 transition-all duration-700 [transition-timing-function:var(--ease)]',
        solid
          ? 'border-b border-cream/[0.08] bg-[#0d0906]/82 backdrop-blur-xl'
          : 'border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5 sm:px-10">
        <Link to={ROUTES.landing} className="group flex items-center gap-2.5">
          <svg
            viewBox="0 0 40 64"
            className="h-6 w-4 text-brass-400 transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:-rotate-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path d="M7.5 7c0 8 3.5 11 3.5 17s-6.5 5-6.5 13 6.5 15 15.5 15 15.5-7 15.5-15-6.5-7-6.5-13 3.5-9 3.5-17" />
            <ellipse cx="20" cy="7" rx="12.5" ry="3" />
          </svg>
          <span className="font-serif text-[17px] font-light tracking-tight text-cream">
            Öz çayın
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {onLanding ? (
            LANDING_NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="group relative py-1 font-sans text-[12.5px] text-cream/50 transition-colors duration-300 hover:text-cream"
              >
                {n.label}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-brass-500/70 transition-transform duration-[420ms] [transition-timing-function:var(--ease)] group-hover:scale-x-100"
                />
              </a>
            ))
          ) : (
            <Link
              to={ROUTES.mix}
              className={[
                'font-sans text-[12.5px] transition-colors duration-300',
                route === ROUTES.mix ? 'text-brass-400' : 'text-cream/50 hover:text-cream',
              ].join(' ')}
            >
              Qarışdırıcı
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2.5">
          {onLanding && (
            <Link to={ROUTES.mix} className="btn btn-quiet hidden sm:inline-flex">
              Qarışıq yarat
            </Link>
          )}
          <Link
            to={ROUTES.cart}
            className={[
              'relative flex items-center gap-2 rounded-[3px] border px-3.5 py-2 font-sans text-[12.5px] transition-all duration-500 [transition-timing-function:var(--ease)]',
              cartCount > 0
                ? 'border-brass-500/55 bg-brass-500/[0.1] text-brass-400 hover:bg-brass-500/[0.18]'
                : 'border-cream/12 text-cream/55 hover:border-cream/25 hover:text-cream',
              bump ? 'scale-[1.08]' : 'scale-100',
            ].join(' ')}
          >
            {bump && (
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-ping-once rounded-[3px] bg-brass-500/40"
              />
            )}
            <svg width="14" height="15" viewBox="0 0 14 15" fill="none" aria-hidden="true">
              <path
                d="M1 4h12l-1 10H2L1 4zM4.5 4V2.6a2.5 2.5 0 0 1 5 0V4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="tabular-nums">Səbət{cartCount > 0 ? ` · ${cartCount}` : ''}</span>
          </Link>
        </div>
      </div>

      {/* how far down the landing page the reader has come — silent otherwise */}
      {onLanding && (
        <div aria-hidden="true" className="h-px w-full bg-cream/[0.06]">
          <div
            ref={progressRef}
            className="h-full w-full origin-left bg-gradient-to-r from-brass-500/70 to-brass-400 [transform:scaleX(0)]"
          />
        </div>
      )}
    </header>
  )
}
