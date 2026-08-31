import { useEffect, useRef } from 'react'
import { drawShape } from '../canvas/shapes'
import type { ShapeKind } from '../../shared/types'

/** Same drawing routine as the pieces inside the glass, so the card matches the liquid. */
export function IngredientGlyph({
  shape,
  size = 44,
  className,
}: {
  shape: ShapeKind
  size?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate(-0.35)
    drawShape(ctx, shape, size * 0.36, 7.3)
    ctx.restore()
  }, [shape, size])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
