import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { TeaEngine, type Mode } from '../canvas/engine'
import type { WeighedItem } from '../../shared/types'

/**
 * One canvas for the whole site. It is fixed behind the content and the jar
 * inside it is fitted to whichever anchor element is currently nearest the
 * middle of the viewport, springing from one to the next as pages change.
 * Pages declare where they want the jar with `useGlassAnchor`; nothing else in
 * the app touches the engine.
 */

interface Registration {
  el: HTMLElement
  fit: number
}

interface GlassApi {
  register: (key: string, el: HTMLElement | null, fit: number) => void
  pour: () => void
  /** Lights one ingredient's pieces in the jar and dims the rest. */
  highlight: (id: string | null) => void
}

const Ctx = createContext<GlassApi | null>(null)

export function useGlass(): GlassApi {
  const api = useContext(Ctx)
  if (!api) throw new Error('useGlass outside GlassStage')
  return api
}

/**
 * Marks an element as a place the glass can sit. `fit` shrinks the glass inside
 * the element's box — 1 fills it, 0.8 leaves a fifth of the box as air.
 */
export function useGlassAnchor(key: string, fit = 1) {
  const { register } = useGlass()
  return useCallback(
    (el: HTMLElement | null) => {
      register(key, el, fit)
    },
    [register, key, fit],
  )
}

interface Props {
  items: WeighedItem[]
  color: [number, number, number]
  /** printed on the jar's paper label */
  name: string
  /** package size in grams, also on the label */
  size: number
  /** dry blend in a closed jar, or the same blend brewed with the lid off */
  mode: Mode
  children: ReactNode
}

export function GlassStage({ items, color, name, size, mode, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<TeaEngine | null>(null)
  const anchors = useRef(new Map<string, Registration>())

  const register = useCallback((key: string, el: HTMLElement | null, fit: number) => {
    if (el) anchors.current.set(key, { el, fit })
    else anchors.current.delete(key)
  }, [])

  const pour = useCallback(() => {
    engineRef.current?.pour()
  }, [])

  const highlight = useCallback((id: string | null) => {
    engineRef.current?.setHighlight(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new TeaEngine(canvas)
    engineRef.current = engine

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const applyMotion = () => {
      engine.reducedMotion = motion.matches
    }
    applyMotion()
    motion.addEventListener('change', applyMotion)

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    // iOS fires resize on every URL-bar collapse; orientation needs its own pass
    window.addEventListener('orientationchange', onResize)

    const onPointer = (e: PointerEvent) => {
      engine.setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      )
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    let raf = 0
    const track = () => {
      raf = requestAnimationFrame(track)
      const focus = window.innerHeight * 0.46
      let best: [string, Registration] | null = null
      let bestDist = Infinity
      for (const entry of anchors.current) {
        const r = entry[1].el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) continue
        // no visibility test: an anchor that has scrolled off the top is still
        // the right target, and it is what carries the glass off the screen with
        // the page instead of leaving it stranded mid-air
        const dist = Math.abs(r.top + r.height / 2 - focus)
        if (dist < bestDist) {
          bestDist = dist
          best = entry
        }
      }
      if (best) {
        engine.setAnchorRect(best[1].el.getBoundingClientRect(), best[1].fit, best[0])
      } else {
        engine.park()
      }
    }
    track()

    const onVisibility = () => {
      if (document.hidden) engine.stop()
      else engine.start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    engine.start()

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.removeEventListener('pointermove', onPointer)
      motion.removeEventListener('change', applyMotion)
      engine.stop()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setBlend(items, color)
  }, [items, color])

  useEffect(() => {
    engineRef.current?.setLabel(name, size)
  }, [name, size])

  useEffect(() => {
    engineRef.current?.setMode(mode)
  }, [mode])

  const api = useMemo<GlassApi>(
    () => ({ register, pour, highlight }),
    [register, pour, highlight],
  )

  return (
    <Ctx.Provider value={api}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        role="img"
        aria-label="Şüşə bankada hazırlanan quru çay qarışığı"
      />
      <div className="relative z-10">{children}</div>
    </Ctx.Provider>
  )
}
