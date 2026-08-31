import { halfAt, yAt, type Geom } from './jar'
import { BLACK, GradCache, mix, rgba, WHITE } from './paint'

/**
 * The brewed side of the jar: hot tea standing in the same vessel the dry blend
 * is stored in, with the lid off. Everything here is a function of `level`
 * (0..1 of BREW_T), so the liquid can rise as it is poured and fall as it drains
 * without any of the passes disagreeing about where the surface is.
 */

/** Where the water line sits when the jar is full, as a fraction of the body. */
export const BREW_T = 0.6

/** Hot water before the leaves have given anything up. */
export const WATER: [number, number, number] = [228, 214, 186]

export function surfaceT(level: number) {
  return BREW_T * level
}

/**
 * Vertical displacement of the surface at one angle around the ellipse. Shared
 * by the fill, the meniscus, ripples and bubbles so they all ride one wave.
 */
export function surfaceOffset(g: Geom, ang: number, time: number, slosh: number): number {
  const front = 0.55 + 0.45 * Math.sin(ang)
  const ripple = Math.sin(ang * 3 + time * 2.2) * 0.6 + Math.sin(ang * 5 - time * 1.5 + 1.3) * 0.4
  const tilt = Math.cos(ang + time * 3.6) * slosh
  return g.maxHalf * (ripple * 0.012 * (0.3 + slosh * 3) * front + tilt * 0.045)
}

/** Everything below the water line, out to the walls. Rebuilt as the level moves. */
export function brewClip(g: Geom, level: number): Path2D {
  const t = surfaceT(level)
  const p = new Path2D()
  const steps = 26
  p.moveTo(g.cx, g.bottom)
  for (let i = 0; i <= steps; i++) {
    const tt = (t * i) / steps
    p.lineTo(g.cx + halfAt(g, tt) - g.wall * 0.5, yAt(g, tt))
  }
  for (let i = steps; i >= 0; i--) {
    const tt = (t * i) / steps
    p.lineTo(g.cx - halfAt(g, tt) + g.wall * 0.5, yAt(g, tt))
  }
  p.closePath()
  return p
}

export function drawBrew(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  level: number,
  cache: GradCache,
) {
  if (level <= 0.004) return
  const top = yAt(g, surfaceT(level))
  const x = g.cx - g.maxHalf * 1.2
  const w = g.maxHalf * 2.4
  const h = g.bottom - top + 4

  ctx.save()
  ctx.globalAlpha = Math.min(1, level / 0.3)
  ctx.fillStyle = cache.get('brewBody', () => {
    const body = ctx.createLinearGradient(0, top, 0, g.bottom)
    body.addColorStop(0, rgba(mix(color, WHITE, 0.08), 0.96))
    body.addColorStop(0.3, rgba(color, 1))
    body.addColorStop(0.82, rgba(mix(color, BLACK, 0.24), 1))
    body.addColorStop(1, rgba(mix(color, BLACK, 0.46), 1))
    return body
  })
  ctx.fillRect(x, top, w, h)

  // total internal reflection darkens the liquid right against the wall
  ctx.fillStyle = cache.get('brewEdge', () => {
    const edge = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf, 0)
    edge.addColorStop(0, rgba(mix(color, BLACK, 0.6), 0.8))
    edge.addColorStop(0.1, rgba(mix(color, BLACK, 0.26), 0.32))
    edge.addColorStop(0.35, 'rgba(0,0,0,0)')
    edge.addColorStop(0.7, 'rgba(0,0,0,0)')
    edge.addColorStop(0.92, rgba(mix(color, BLACK, 0.28), 0.38))
    edge.addColorStop(1, rgba(mix(color, BLACK, 0.62), 0.86))
    return edge
  })
  ctx.fillRect(x, top, w, h)

  // light entering from the left and scattering through the body
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = cache.get('brewBeam', () => {
    const beam = ctx.createLinearGradient(g.cx - g.maxHalf * 0.9, top, g.cx + g.maxHalf * 0.3, g.bottom)
    beam.addColorStop(0, rgba(mix(color, WHITE, 0.45), 0.16))
    beam.addColorStop(0.45, rgba(color, 0.04))
    beam.addColorStop(1, 'rgba(0,0,0,0)')
    return beam
  })
  ctx.fillRect(x, top, w, h)
  ctx.restore()
}

/**
 * Bands of light travelling down through the tea — the thing that makes a lit
 * glass of it look alive rather than like a coloured shape.
 */
export function drawBrewCaustics(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  level: number,
  time: number,
) {
  if (level <= 0.06) return
  const top = yAt(g, surfaceT(level))
  const span = g.bottom - top
  if (span <= 2) return

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const hot = mix(color, WHITE, 0.55)
  const steps = 7
  for (let i = 0; i < 2; i++) {
    const k = ((time * (0.1 + i * 0.05) + i * 0.5) % 1.5) - 0.25
    if (k < 0 || k > 1) continue
    const y = top + span * k
    const thick = span * (0.13 + i * 0.04)
    const a = 0.1 * Math.sin(k * Math.PI) ** 0.8 * level

    // a flat fill leaves a hard line that reads as a seam across the glass
    const grad = ctx.createLinearGradient(0, y - thick * 0.6, 0, y + thick * 1.6)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.5, rgba(hot, a))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad

    ctx.beginPath()
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      ctx.lineTo(
        g.cx + (u - 0.5) * g.maxHalf * 2.4,
        y - thick * 0.6 + Math.sin(u * 6.1 + time * 1.4 + i) * thick * 0.4,
      )
    }
    for (let s = steps; s >= 0; s--) {
      const u = s / steps
      ctx.lineTo(
        g.cx + (u - 0.5) * g.maxHalf * 2.4,
        y + thick * 1.6 + Math.sin(u * 6.1 + time * 1.4 + i) * thick * 0.4,
      )
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function drawBrewSurface(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  level: number,
  time: number,
  slosh: number,
  cache: GradCache,
) {
  if (level <= 0.004) return
  const t = surfaceT(level)
  const y0 = yAt(g, t)
  const half = halfAt(g, t) - g.wall * 0.6
  const ry = half * 0.2

  const STEPS = 44
  const ring = () => {
    ctx.beginPath()
    for (let i = 0; i <= STEPS; i++) {
      const ang = (i / STEPS) * Math.PI * 2
      ctx.lineTo(
        g.cx + Math.cos(ang) * half,
        y0 + Math.sin(ang) * ry + surfaceOffset(g, ang, time, slosh),
      )
    }
    ctx.closePath()
  }

  ctx.save()
  ctx.globalAlpha = Math.min(1, level / 0.3)
  ring()
  ctx.fillStyle = cache.get('brewSurface', () => {
    const top = ctx.createLinearGradient(g.cx - half, y0 - ry, g.cx + half, y0 + ry)
    top.addColorStop(0, rgba(mix(color, WHITE, 0.44), 1))
    top.addColorStop(0.45, rgba(mix(color, WHITE, 0.1), 1))
    top.addColorStop(1, rgba(mix(color, BLACK, 0.2), 1))
    return top
  })
  ctx.fill()

  // meniscus: the tea climbs the wall and catches a bright line
  ring()
  ctx.strokeStyle = rgba(mix(color, WHITE, 0.55), 0.34)
  ctx.lineWidth = Math.max(0.7, g.wall * 0.45)
  ctx.stroke()

  ctx.globalCompositeOperation = 'lighter'
  const sway = Math.sin(time * 0.7) * half * 0.05
  ctx.beginPath()
  ctx.ellipse(
    g.cx - half * 0.3 + sway,
    y0 - ry * 0.25 + surfaceOffset(g, Math.PI * 1.5, time, slosh) * 0.6,
    half * 0.4,
    ry * 0.42,
    -0.2,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = 'rgba(255,246,226,0.22)'
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(
    g.cx + half * (0.32 + Math.sin(time * 0.53) * 0.09),
    y0 + ry * 0.2,
    half * 0.16,
    ry * 0.24,
    0.3,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = 'rgba(255,240,210,0.15)'
  ctx.fill()
  ctx.restore()
}

/** The bright kink where the water line crosses the wall. */
export function drawBrewKink(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  level: number,
) {
  if (level <= 0.02) return
  const t = surfaceT(level)
  const y0 = yAt(g, t)
  const half = halfAt(g, t)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const dir of [-1, 1]) {
    const x = g.cx + dir * half
    const grd = ctx.createLinearGradient(x - dir * g.wall * 3.5, 0, x, 0)
    grd.addColorStop(0, 'rgba(0,0,0,0)')
    grd.addColorStop(1, rgba(mix(color, WHITE, 0.55), 0.45))
    ctx.fillStyle = grd
    ctx.fillRect(Math.min(x, x - dir * g.wall * 3.5), y0 - g.wall * 1.7, g.wall * 3.5, g.wall * 3.4)
  }
  ctx.restore()
}

/**
 * Condensation on the inside of the glass above the water line — the detail
 * that says the tea in there is actually hot.
 */
export function drawCondensation(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  level: number,
  time: number,
) {
  if (level <= 0.25) return
  const t = surfaceT(level)
  const y0 = yAt(g, t)
  const span = g.top - y0
  if (span >= -1) return

  ctx.save()
  ctx.clip(g.outer)
  ctx.globalCompositeOperation = 'lighter'
  // a soft fog band just above the surface, thickest where it is hottest
  const fog = ctx.createLinearGradient(0, y0 + span * 0.9, 0, y0)
  fog.addColorStop(0, 'rgba(255,250,240,0)')
  fog.addColorStop(0.6, 'rgba(255,250,240,0.05)')
  fog.addColorStop(1, 'rgba(255,250,240,0.1)')
  ctx.fillStyle = fog
  ctx.fillRect(g.cx - g.maxHalf * 1.1, y0 + span, g.maxHalf * 2.2, -span)

  // and a scatter of beads, each with its own tiny highlight
  ctx.fillStyle = 'rgba(255,252,244,0.5)'
  for (let i = 0; i < 22; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453
    const rx = a - Math.floor(a)
    const b = Math.sin(i * 78.233) * 43758.5453
    const ry = b - Math.floor(b)
    const tt = t + (1 - t) * (0.05 + ry * 0.85)
    const wall = halfAt(g, tt) - g.wall * 1.4
    const side = i % 2 === 0 ? -1 : 1
    const x = g.cx + side * wall * (0.35 + rx * 0.6)
    const y = yAt(g, tt)
    // beads swell and slide as the glass warms
    const r = g.maxHalf * (0.006 + rx * 0.012) * (1 + Math.sin(time * 0.4 + i) * 0.15)
    ctx.globalAlpha = 0.3 + rx * 0.35
    ctx.beginPath()
    ctx.arc(x, y + Math.sin(time * 0.25 + i * 2.1) * g.maxHalf * 0.01, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The stream of water going in. `head` is how far its leading edge has fallen,
 * so the first frames show a stream that has not reached the jar yet.
 */
export function drawPourStream(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  k: number,
  head: number,
  time: number,
) {
  if (k <= 0.01) return
  const startY = g.top - g.bodyH * 0.42
  const endY = Math.min(head, yAt(g, BREW_T) + g.maxHalf * 0.05)
  if (endY <= startY) return

  const x0 = g.cx - g.maxHalf * 0.06
  const w0 = g.maxHalf * 0.075 * k
  const w1 = g.maxHalf * 0.042 * k
  const STEPS = 22
  const at = (i: number) => {
    const u = i / STEPS
    const y = startY + (endY - startY) * u
    const wob = Math.sin(u * 8.5 - time * 13) * g.maxHalf * 0.009 * u
    return { y, x: x0 + wob + u * u * g.maxHalf * 0.05, w: w0 + (w1 - w0) * u }
  }

  ctx.save()
  ctx.beginPath()
  for (let i = 0; i <= STEPS; i++) {
    const p = at(i)
    ctx.lineTo(p.x - p.w, p.y)
  }
  for (let i = STEPS; i >= 0; i--) {
    const p = at(i)
    ctx.lineTo(p.x + p.w, p.y)
  }
  ctx.closePath()
  // the stream comes from a pot outside the frame, so its top has to fade out
  const grad = ctx.createLinearGradient(0, startY, 0, endY)
  grad.addColorStop(0, rgba(mix(color, WHITE, 0.5), 0))
  grad.addColorStop(0.18, rgba(mix(color, WHITE, 0.42), 0.45))
  grad.addColorStop(0.42, rgba(mix(color, WHITE, 0.16), 0.85))
  grad.addColorStop(1, rgba(color, 0.95))
  ctx.fillStyle = grad
  ctx.fill()

  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()
  for (let i = 0; i <= STEPS; i++) {
    const p = at(i)
    ctx.lineTo(p.x - p.w * 0.4, p.y)
  }
  const sheen = ctx.createLinearGradient(0, startY, 0, endY)
  sheen.addColorStop(0, 'rgba(255,246,226,0)')
  sheen.addColorStop(0.3, 'rgba(255,246,226,0.5)')
  sheen.addColorStop(1, 'rgba(255,246,226,0.55)')
  ctx.strokeStyle = sheen
  ctx.lineWidth = Math.max(0.8, g.maxHalf * 0.016 * k)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()
}
