import { useRef, useState } from 'react'
import { BY_ID } from '../../shared/data/ingredients'
import { blendName } from '../../shared/lib/copy'
import { formatGrams, rgb } from '../../shared/lib/blend'
import { manat } from '../../shared/lib/pricing'
import type { WeighedItem } from '../../shared/types'

/**
 * The pouch as it will be printed. It tilts toward the cursor — a few degrees
 * only; the point is that the card feels like an object, not that it spins.
 */
export function PackageLabel({
  name,
  items,
  price,
  size,
  color,
}: {
  name: string
  items: WeighedItem[]
  price: number
  size: number
  color: [number, number, number]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const title = blendName(name)

  function move(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -9,
      y: ((e.clientX - r.left) / r.width - 0.5) * 11,
    })
  }

  return (
    <div className="mx-auto w-full max-w-[248px] select-none [perspective:1100px]">
      <div
        ref={ref}
        onPointerMove={move}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
        className="relative aspect-[3/4.4] overflow-hidden rounded-[2px] border border-brass-600/40 bg-[#17100a] px-5 py-6 shadow-[0_34px_80px_-34px_rgba(0,0,0,0.95)] transition-transform duration-500 [transform-style:preserve-3d] [transition-timing-function:var(--ease)]"
      >
        {/* the blend's own colour, bled into the top of the pouch */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-2/5 opacity-[0.22] transition-colors duration-700"
          style={{
            background: `radial-gradient(120% 100% at 50% 0%, ${rgb(color)} 0%, transparent 70%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-[6px] rounded-[1px] border border-brass-600/22" />
        {/* a sheen that follows the tilt */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 transition-transform duration-500"
          style={{
            background:
              'linear-gradient(115deg, transparent 34%, rgba(255,244,220,0.09) 50%, transparent 66%)',
            transform: `translateX(${tilt.y * 1.6}%)`,
          }}
        />

        <div className="relative flex h-full flex-col">
          <div className="text-center font-sans text-[8.5px] tracking-[0.24em] text-brass-400/70">
            FƏRDİ QARIŞIQ
          </div>

          <div className="my-auto text-center">
            <svg
              viewBox="0 0 40 64"
              className="mx-auto mb-3.5 h-12 w-8 text-brass-400/55"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <path d="M7.5 7c0 8 3.5 11 3.5 17s-6.5 5-6.5 13 6.5 15 15.5 15 15.5-7 15.5-15-6.5-7-6.5-13 3.5-9 3.5-17" />
              <ellipse cx="20" cy="7" rx="12.5" ry="3" />
              <path d="M20 52v6M13 59h14" strokeLinecap="round" />
            </svg>
            <h3 className="break-words font-serif text-[1.45rem] font-light leading-[1.1] text-cream">
              {title}
            </h3>
            <div className="mx-auto mt-2.5 h-px w-9 bg-brass-500/45" />
            <div className="mt-2.5 font-serif text-[13px] font-light italic text-cream/45">
              {size} qram · {manat(price)}
            </div>
          </div>

          <div className="mt-auto">
            <div className="mb-1.5 font-sans text-[7.5px] tracking-[0.18em] text-cream/30">
              TƏRKİB
            </div>
            <ul className="space-y-0.5">
              {items.map((it) => (
                <li
                  key={it.ingredientId}
                  className="flex justify-between font-sans text-[9.5px] text-cream/55"
                >
                  <span className="truncate pr-2">{BY_ID[it.ingredientId]?.name}</span>
                  <span className="shrink-0 tabular-nums">{formatGrams(it.grams)} q</span>
                </li>
              ))}
              {items.length === 0 && (
                <li className="font-sans text-[9.5px] italic text-cream/25">hələ boşdur</li>
              )}
            </ul>
            <div className="mt-2.5 border-t border-cream/10 pt-1.5 text-center font-sans text-[7.5px] tracking-[0.22em] text-cream/22">
              BAKI · AZƏRBAYCAN
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
