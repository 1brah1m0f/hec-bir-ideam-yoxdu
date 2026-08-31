import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'

/**
 * Scroll reveals. One IntersectionObserver instance per element is fine at this
 * page's scale and keeps the API to a single prop; the actual motion is CSS, so
 * `prefers-reduced-motion` disables it without any JS branch.
 */

export function useInView<T extends HTMLElement>(once = true, margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          if (once) io.disconnect()
        } else if (!once) {
          setSeen(false)
        }
      },
      { rootMargin: margin, threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once, margin])

  return { ref, seen }
}

type RevealKind = 'up' | 'fade' | 'left' | 'right' | 'scale'

interface RevealProps {
  children: ReactNode
  /** milliseconds of stagger before this element starts */
  delay?: number
  kind?: RevealKind
  as?: ElementType
  className?: string
  style?: CSSProperties
}

export function Reveal({
  children,
  delay = 0,
  kind = 'up',
  as: Tag = 'div',
  className = '',
  style,
}: RevealProps) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <Tag
      ref={ref}
      data-reveal={kind}
      data-in={seen ? '' : undefined}
      className={className}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

/**
 * A headline that arrives line by line. Each line is clipped by its own
 * overflow-hidden row, so the text slides up out of nothing rather than fading.
 */
export function Lines({
  lines,
  className = '',
  lineClassName = '',
  delay = 0,
  step = 90,
}: {
  lines: string[]
  className?: string
  lineClassName?: string
  delay?: number
  step?: number
}) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`block overflow-hidden ${lineClassName}`}>
          <span
            data-reveal="line"
            data-in={seen ? '' : undefined}
            className="block"
            style={{ transitionDelay: `${delay + i * step}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </div>
  )
}

/** Numbers that count up when they scroll into view, and on every later change. */
export function Counter({
  value,
  decimals = 0,
  duration = 620,
  className,
}: {
  value: number
  decimals?: number
  duration?: number
  className?: string
}) {
  const { ref, seen } = useInView<HTMLSpanElement>()
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    // visibility only decides whether the change is *animated*. A counter that
    // has not been seen still has to show the right number — the bottom action
    // bar sits inside the observer's negative margin and would otherwise be
    // stuck on whatever the value was at mount.
    if (!seen) {
      setShown(value)
      from.current = value
      return
    }
    const start = performance.now()
    const a = from.current
    const b = value
    if (a === b) {
      setShown(b)
      return
    }
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - k) ** 3
      setShown(a + (b - a) * eased)
      if (k < 1) raf.current = requestAnimationFrame(tick)
      else from.current = b
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, seen, duration])

  const text = decimals > 0 ? shown.toFixed(decimals).replace('.', ',') : Math.round(shown).toString()
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  )
}
