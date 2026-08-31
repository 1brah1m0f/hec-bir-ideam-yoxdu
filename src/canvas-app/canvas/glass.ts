/**
 * Armudu glass: geometry + every layer that sells it as real glass.
 * The silhouette is sampled once per resize into a lookup table; physics and
 * every drawing pass read the same table, so contents can never escape the walls.
 */

/**
 * [t, halfWidth] up the bowl — t=0 rounded base, t=1 flared rim.
 *
 * Traced from a standard armudu (90 mm tall, 57 mm across the belly, 42 mm at
 * the waist, 55 mm at the rim): the belly is low and genuinely round, widest at
 * a third of the height; the waist pinches to 0.74 at just over two thirds; the
 * rim opens back out to almost the belly's width.
 *
 * Two things separate this from a tulip wine glass and both matter: the belly
 * sits low rather than halfway up, and there is no stem — see `footH` below.
 */
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.015, 0.32],
  [0.05, 0.55],
  [0.1, 0.755],
  [0.16, 0.89],
  [0.22, 0.962],
  [0.28, 0.995],
  [0.33, 1.0],
  [0.4, 0.981],
  [0.47, 0.938],
  [0.54, 0.877],
  [0.61, 0.808],
  [0.69, 0.744],
  [0.75, 0.746],
  [0.81, 0.784],
  [0.87, 0.845],
  [0.94, 0.915],
  [1.0, 0.958],
]

const SAMPLES = 160

/** Liquid line — high in the neck, just under the flare, the way an armudu is poured. */
export const SURFACE_T = 0.855

/**
 * Gradients are rebuilt only when the blend colour or fill actually moves.
 * Recreating a dozen of them every frame was costing more than the particles.
 */
export class GradCache {
  private map = new Map<string, CanvasGradient>()
  private key = ''

  frame(color: [number, number, number], fill: number) {
    const key = `${color[0] >> 1}.${color[1] >> 1}.${color[2] >> 1}.${Math.round(fill * 50)}`
    if (key !== this.key) {
      this.key = key
      this.map.clear()
    }
  }

  get(name: string, make: () => CanvasGradient): CanvasGradient {
    let grad = this.map.get(name)
    if (!grad) {
      grad = make()
      this.map.set(name, grad)
    }
    return grad
  }

  clear() {
    this.map.clear()
    this.key = ''
  }
}

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export interface Geom {
  w: number
  h: number
  cx: number
  /** y of bowl bottom (t=0) */
  bottom: number
  /** y of rim (t=1) */
  top: number
  bowlH: number
  maxHalf: number
  wall: number
  saucerY: number
  saucerRX: number
  saucerRY: number
  footY: number
  footH: number
  footHalf: number
  stemHalf: number
  table: number[]
  outer: Path2D
  inner: Path2D
  /** everything below the liquid line, out to the outer silhouette (refraction) */
  liquidClip: Path2D
  surfaceY: number
  surfaceHalf: number
  /** the point pinned to the on-screen placement anchor */
  anchorX: number
  anchorY: number
  backBounds: Bounds
  frontBounds: Bounds
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

function sampleProfile(t: number): number {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t
  let i = 0
  while (i < PROFILE.length - 2 && PROFILE[i + 1][0] < clamped) i++
  const [t1, v1] = PROFILE[i]
  const [t2, v2] = PROFILE[i + 1]
  const v0 = PROFILE[Math.max(0, i - 1)][1]
  const v3 = PROFILE[Math.min(PROFILE.length - 1, i + 2)][1]
  const local = t2 === t1 ? 0 : (clamped - t1) / (t2 - t1)
  return Math.max(0, catmull(v0, v1, v2, v3, local))
}

export function halfAt(g: Geom, t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return g.table[SAMPLES]
  const f = t * SAMPLES
  const i = Math.floor(f)
  const frac = f - i
  return g.table[i] + (g.table[i + 1] - g.table[i]) * frac
}

export function yAt(g: Geom, t: number): number {
  return g.bottom - t * g.bowlH
}

export function tAtY(g: Geom, y: number): number {
  return (g.bottom - y) / g.bowlH
}

function bowlPath(g: Geom, inset: number): Path2D {
  const p = new Path2D()
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const half = Math.max(0, g.table[i] - inset)
    const y = g.bottom - t * g.bowlH
    if (i === 0) p.moveTo(g.cx, y)
    else p.lineTo(g.cx + half, y)
  }
  for (let i = SAMPLES; i >= 0; i--) {
    const t = i / SAMPLES
    const half = Math.max(0, g.table[i] - inset)
    p.lineTo(g.cx - half, g.bottom - t * g.bowlH)
  }
  p.closePath()
  return p
}

export function computeGeom(w: number, h: number): Geom {
  const cx = w / 2
  const saucerY = h * 0.93
  const bowlH = Math.min(h * 0.66, w * 1.62)
  // an armudu is a tall glass: ~90 mm of bowl to ~55 mm across the belly, so the
  // half-width has to stay near 0.30 of the height or the silhouette turns into
  // a brandy balloon
  const maxHalf = bowlH * 0.302
  // an armudu has no stem: the bowl sits on a stubby base a few millimetres tall
  const footH = bowlH * 0.036
  const bottom = saucerY - footH - h * 0.006
  const top = bottom - bowlH

  const table: number[] = []
  for (let i = 0; i <= SAMPLES; i++) table.push(sampleProfile(i / SAMPLES) * maxHalf)

  const g: Geom = {
    w,
    h,
    cx,
    bottom,
    top,
    bowlH,
    maxHalf,
    wall: Math.max(1.4, maxHalf * 0.05),
    saucerY,
    saucerRX: maxHalf * 1.9,
    saucerRY: maxHalf * 1.9 * 0.23,
    footY: saucerY - h * 0.008,
    footH,
    footHalf: maxHalf * 0.42,
    stemHalf: maxHalf * 0.36,
    table,
    outer: new Path2D(),
    inner: new Path2D(),
    liquidClip: new Path2D(),
    surfaceY: 0,
    surfaceHalf: 0,
    anchorX: cx,
    anchorY: 0,
    backBounds: { x: 0, y: 0, w, h },
    frontBounds: { x: 0, y: 0, w, h },
  }

  g.outer = bowlPath(g, 0)
  g.inner = bowlPath(g, g.wall)
  g.surfaceY = yAt(g, SURFACE_T)
  g.surfaceHalf = halfAt(g, SURFACE_T)
  g.anchorY = (top + saucerY) / 2

  // clipped every frame, so it is sampled coarsely — the profile is smooth
  // enough that a quarter of the points is visually identical
  const lc = new Path2D()
  const stride = 4
  const iSurf = Math.floor((SURFACE_T * SAMPLES) / stride) * stride
  lc.moveTo(cx, g.bottom)
  for (let i = 0; i <= iSurf; i += stride)
    lc.lineTo(cx + g.table[i], g.bottom - (i / SAMPLES) * bowlH)
  lc.lineTo(cx + g.surfaceHalf, g.surfaceY)
  lc.lineTo(cx - g.surfaceHalf, g.surfaceY)
  for (let i = iSurf; i >= 0; i -= stride)
    lc.lineTo(cx - g.table[i], g.bottom - (i / SAMPLES) * bowlH)
  lc.closePath()
  g.liquidClip = lc

  const clampBounds = (b: Bounds): Bounds => {
    const x = Math.max(0, Math.floor(b.x))
    const y = Math.max(0, Math.floor(b.y))
    return {
      x,
      y,
      w: Math.min(w - x, Math.ceil(b.w + (b.x - x))),
      h: Math.min(h - y, Math.ceil(b.h + (b.y - y))),
    }
  }
  g.backBounds = clampBounds({
    x: cx - g.saucerRX * 1.12,
    y: top - g.maxHalf * 0.35,
    w: g.saucerRX * 2.24,
    h: saucerY + g.saucerRY * 1.7 - (top - g.maxHalf * 0.35),
  })
  g.frontBounds = clampBounds({
    x: cx - maxHalf * 1.08,
    y: top - g.maxHalf * 0.35,
    w: maxHalf * 2.16,
    h: g.bottom + g.wall * 2 - (top - g.maxHalf * 0.35),
  })

  return g
}

export function makeBlob(size: number, inner: string, outer: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')!
  const grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, inner)
  grad.addColorStop(0.55, outer)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = grad
  x.fillRect(0, 0, size, size)
  return c
}

export const rgba = (c: [number, number, number], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`

export function mix(
  a: [number, number, number],
  b: [number, number, number],
  k: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ]
}

export const WHITE: [number, number, number] = [255, 248, 235]
export const BLACK: [number, number, number] = [18, 10, 5]

/**
 * Vertical displacement of the liquid surface at one angle around the ellipse.
 * Shared by the surface fill, the meniscus, ripples and bubble pops, so all of
 * them ride the same wave instead of drifting apart.
 */
export function surfaceOffset(g: Geom, ang: number, time: number, slosh: number): number {
  const front = 0.55 + 0.45 * Math.sin(ang)
  const ripple = Math.sin(ang * 3 + time * 2.2) * 0.6 + Math.sin(ang * 5 - time * 1.5 + 1.3) * 0.4
  const tilt = Math.cos(ang + time * 3.6) * slosh
  return g.maxHalf * (ripple * 0.016 * (0.3 + slosh * 3) * front + tilt * 0.06)
}

export function drawAmbientGlow(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  fill: number,
  blob: HTMLCanvasElement,
) {
  if (fill <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.15 * fill
  const r = g.maxHalf * 3.1
  const cy = g.bottom - g.bowlH * 0.36
  ctx.drawImage(blob, g.cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
}

export function drawSaucer(ctx: CanvasRenderingContext2D, g: Geom) {
  const { cx, saucerY, saucerRX, saucerRY } = g

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, saucerY + saucerRY * 0.16, saucerRX * 1.02, saucerRY * 1.02, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(8,4,2,0.75)'
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(cx, saucerY, saucerRX, saucerRY, 0, 0, Math.PI * 2)
  const face = ctx.createLinearGradient(cx, saucerY - saucerRY, cx, saucerY + saucerRY)
  face.addColorStop(0, '#3a2a1e')
  face.addColorStop(0.5, '#2a1d14')
  face.addColorStop(1, '#1c130d')
  ctx.fillStyle = face
  ctx.fill()

  ctx.lineWidth = Math.max(1, saucerRY * 0.055)
  const rim = ctx.createLinearGradient(cx - saucerRX, saucerY, cx + saucerRX, saucerY)
  rim.addColorStop(0, 'rgba(150,104,52,0.55)')
  rim.addColorStop(0.35, 'rgba(216,178,106,0.85)')
  rim.addColorStop(0.7, 'rgba(120,84,42,0.5)')
  rim.addColorStop(1, 'rgba(180,132,70,0.6)')
  ctx.strokeStyle = rim
  ctx.stroke()

  // the shallow well the foot sits in
  ctx.beginPath()
  ctx.ellipse(cx, saucerY + saucerRY * 0.05, saucerRX * 0.46, saucerRY * 0.46, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(196,152,88,0.1)'
  ctx.lineWidth = Math.max(0.7, saucerRY * 0.035)
  ctx.stroke()

  // a spoon resting on the far edge — small, but it fixes the scale of everything
  ctx.translate(cx + saucerRX * 0.5, saucerY - saucerRY * 0.3)
  ctx.rotate(-0.42)
  const spoon = ctx.createLinearGradient(0, -saucerRY * 0.3, 0, saucerRY * 0.3)
  spoon.addColorStop(0, 'rgba(232,204,158,0.5)')
  spoon.addColorStop(0.5, 'rgba(150,120,80,0.34)')
  spoon.addColorStop(1, 'rgba(84,64,42,0.3)')
  ctx.fillStyle = spoon
  ctx.beginPath()
  ctx.ellipse(0, 0, saucerRX * 0.15, saucerRY * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(saucerRX * 0.33, saucerRY * 0.02, saucerRX * 0.22, saucerRY * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawCaustic(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  fill: number,
  blob: HTMLCanvasElement,
  time: number,
) {
  if (fill <= 0.02) return
  const cy = g.saucerY + g.saucerRY * 0.1
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  // the pool of light the liquid throws onto the saucer, away from the key light
  ctx.globalAlpha = 0.32 * fill
  const rx = g.maxHalf * 1.5
  const ry = rx * 0.26
  ctx.save()
  ctx.translate(g.cx + g.maxHalf * 0.42, cy)
  ctx.scale(1, ry / rx)
  ctx.drawImage(blob, -rx, -rx, rx * 2, rx * 2)
  ctx.restore()

  // a brighter focused core inside the pool, wandering slowly
  for (let i = 0; i < 2; i++) {
    const wob = Math.sin(time * 0.4 + i * 2.3) * g.maxHalf * 0.07
    const cr = g.maxHalf * (0.62 - i * 0.24)
    ctx.globalAlpha = fill * (0.2 + i * 0.14)
    ctx.save()
    ctx.translate(g.cx + g.maxHalf * (0.3 + i * 0.12) + wob, cy + g.saucerRY * 0.06)
    ctx.scale(1, 0.28)
    ctx.drawImage(blob, -cr, -cr, cr * 2, cr * 2)
    ctx.restore()
  }
  ctx.restore()
}

export function drawContactShadow(ctx: CanvasRenderingContext2D, g: Geom, blob: HTMLCanvasElement) {
  ctx.save()
  ctx.globalAlpha = 0.8
  const rx = g.footHalf * 2.3
  const ry = rx * 0.36
  ctx.save()
  ctx.translate(g.cx - g.maxHalf * 0.16, g.saucerY + g.saucerRY * 0.1)
  ctx.scale(1, ry / rx)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(blob, -rx, -rx, rx * 2, rx * 2)
  ctx.restore()
  ctx.restore()
}

export function drawFoot(ctx: CanvasRenderingContext2D, g: Geom) {
  const { cx, bottom, footH, footHalf, stemHalf } = g
  const stemTop = bottom - footH * 0.25
  const footBase = bottom + footH

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - stemHalf, stemTop)
  ctx.lineTo(cx + stemHalf, stemTop)
  ctx.quadraticCurveTo(
    cx + footHalf * 0.8,
    footBase - footH * 0.5,
    cx + footHalf,
    footBase - footH * 0.2,
  )
  ctx.lineTo(cx + footHalf * 0.96, footBase)
  ctx.lineTo(cx - footHalf * 0.96, footBase)
  ctx.lineTo(cx - footHalf, footBase - footH * 0.2)
  ctx.quadraticCurveTo(cx - footHalf * 0.8, footBase - footH * 0.5, cx - stemHalf, stemTop)
  ctx.closePath()
  const grad = ctx.createLinearGradient(cx - footHalf, 0, cx + footHalf, 0)
  grad.addColorStop(0, 'rgba(212,198,176,0.14)')
  grad.addColorStop(0.16, 'rgba(255,246,228,0.42)')
  grad.addColorStop(0.4, 'rgba(120,104,86,0.16)')
  grad.addColorStop(0.78, 'rgba(226,206,176,0.3)')
  grad.addColorStop(1, 'rgba(150,132,110,0.16)')
  ctx.fillStyle = grad
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(cx, footBase, footHalf * 0.94, footH * 0.2, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,244,224,0.2)'
  ctx.fill()
  ctx.restore()
}

/** Empty glass body — walls, thin inner shading, faint back wall. */
export function drawGlassBody(ctx: CanvasRenderingContext2D, g: Geom) {
  ctx.save()
  ctx.fillStyle = 'rgba(228,214,190,0.035)'
  ctx.fill(g.outer)

  ctx.save()
  ctx.clip(g.outer)
  const side = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf, 0)
  side.addColorStop(0, 'rgba(246,232,206,0.2)')
  side.addColorStop(0.12, 'rgba(246,232,206,0.05)')
  side.addColorStop(0.5, 'rgba(0,0,0,0)')
  side.addColorStop(0.9, 'rgba(238,222,196,0.07)')
  side.addColorStop(1, 'rgba(238,222,196,0.22)')
  ctx.fillStyle = side
  ctx.fill(g.outer)

  // the inside floor of the bowl, seen through the front wall — the cue that
  // reads as "empty" before any liquid is poured
  const floorY = yAt(g, 0.1)
  const floorHalf = halfAt(g, 0.1) - g.wall
  ctx.beginPath()
  ctx.ellipse(g.cx, floorY, floorHalf, floorHalf * 0.32, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,240,214,0.14)'
  ctx.lineWidth = Math.max(0.7, g.wall * 0.4)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(g.cx, floorY, floorHalf, floorHalf * 0.32, 0, Math.PI * 0.15, Math.PI * 0.7)
  ctx.strokeStyle = 'rgba(255,246,228,0.3)'
  ctx.stroke()

  // the bowl's thick base acts as a lens and stays bright even when empty
  ctx.globalCompositeOperation = 'lighter'
  const baseLens = ctx.createRadialGradient(
    g.cx,
    g.bottom - g.maxHalf * 0.1,
    0,
    g.cx,
    g.bottom - g.maxHalf * 0.1,
    g.maxHalf * 0.85,
  )
  baseLens.addColorStop(0, 'rgba(255,238,208,0.16)')
  baseLens.addColorStop(1, 'rgba(255,230,190,0)')
  ctx.fillStyle = baseLens
  ctx.fill(g.outer)
  ctx.restore()
  ctx.restore()
}

export function drawLiquid(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  fill: number,
  cache: GradCache,
) {
  if (fill <= 0.005) return
  const surfaceY = yAt(g, SURFACE_T * fill)
  const x = g.cx - g.maxHalf * 1.4
  const w = g.maxHalf * 2.8
  const h = g.bottom - surfaceY + 4

  ctx.save()
  if (fill < 0.999) {
    ctx.beginPath()
    ctx.rect(x, surfaceY, w, h)
    ctx.clip()
  }

  ctx.fillStyle = cache.get('body', () => {
    const body = ctx.createLinearGradient(0, surfaceY, 0, g.bottom)
    body.addColorStop(0, rgba(mix(color, WHITE, 0.06), 0.97))
    body.addColorStop(0.3, rgba(color, 1))
    body.addColorStop(0.8, rgba(mix(color, BLACK, 0.26), 1))
    body.addColorStop(1, rgba(mix(color, BLACK, 0.5), 1))
    return body
  })
  ctx.fillRect(x, surfaceY, w, h)

  // total-internal-reflection darkening where the liquid meets the wall
  ctx.fillStyle = cache.get('edge', () => {
    const edge = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf, 0)
    edge.addColorStop(0, rgba(mix(color, BLACK, 0.6), 0.85))
    edge.addColorStop(0.1, rgba(mix(color, BLACK, 0.28), 0.35))
    edge.addColorStop(0.34, 'rgba(0,0,0,0)')
    edge.addColorStop(0.7, 'rgba(0,0,0,0)')
    edge.addColorStop(0.92, rgba(mix(color, BLACK, 0.3), 0.4))
    edge.addColorStop(1, rgba(mix(color, BLACK, 0.62), 0.9))
    return edge
  })
  ctx.fillRect(x, surfaceY, w, h)

  // light entering from the left, scattering through the body
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = cache.get('beam', () => {
    const beam = ctx.createLinearGradient(
      g.cx - g.maxHalf * 0.8,
      surfaceY,
      g.cx + g.maxHalf * 0.3,
      g.bottom,
    )
    beam.addColorStop(0, rgba(mix(color, WHITE, 0.4), 0.15))
    beam.addColorStop(0.45, rgba(color, 0.04))
    beam.addColorStop(1, 'rgba(0,0,0,0)')
    return beam
  })
  ctx.fillRect(x, surfaceY, w, h)
  ctx.restore()
}

/**
 * Bands of light travelling down through the liquid — the thing that makes a lit
 * glass of tea look alive rather than like a coloured rectangle. Drawn inside
 * the liquid clip.
 */
export function drawLiquidCaustics(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  fill: number,
  time: number,
) {
  if (fill <= 0.05) return
  const surfaceY = yAt(g, SURFACE_T * fill)
  const span = g.bottom - surfaceY
  if (span <= 2) return

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const hot = mix(color, WHITE, 0.55)
  const steps = 7
  for (let i = 0; i < 2; i++) {
    const k = ((time * (0.1 + i * 0.05) + i * 0.5) % 1.5) - 0.25
    if (k < 0 || k > 1) continue
    const y = surfaceY + span * k
    const thick = span * (0.13 + i * 0.04)
    const a = 0.11 * Math.sin(k * Math.PI) ** 0.8 * fill

    // a flat fill leaves a hard line top and bottom that reads as a seam across
    // the glass; the band has to fade out into the liquid at both edges
    const grad = ctx.createLinearGradient(0, y - thick * 0.6, 0, y + thick * 1.6)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.5, rgba(hot, a))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad

    ctx.beginPath()
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      const px = g.cx + (u - 0.5) * g.maxHalf * 2.6
      ctx.lineTo(px, y - thick * 0.6 + Math.sin(u * 6.1 + time * 1.4 + i) * thick * 0.4)
    }
    for (let s = steps; s >= 0; s--) {
      const u = s / steps
      const px = g.cx + (u - 0.5) * g.maxHalf * 2.6
      ctx.lineTo(px, y + thick * 1.6 + Math.sin(u * 6.1 + time * 1.4 + i) * thick * 0.4)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export function drawSurface(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  fill: number,
  time: number,
  slosh: number,
  cache: GradCache,
) {
  if (fill <= 0.005) return
  const surfaceT = SURFACE_T * fill
  const surfaceY = yAt(g, surfaceT)
  const half = halfAt(g, surfaceT) - g.wall * 0.35
  const ry = half * 0.19

  const STEPS = 44
  const ring = () => {
    ctx.beginPath()
    for (let i = 0; i <= STEPS; i++) {
      const ang = (i / STEPS) * Math.PI * 2
      const x = g.cx + Math.cos(ang) * half
      const y = surfaceY + Math.sin(ang) * ry + surfaceOffset(g, ang, time, slosh)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  ctx.save()
  ring()
  ctx.fillStyle = cache.get('surface', () => {
    const top = ctx.createLinearGradient(g.cx - half, surfaceY - ry, g.cx + half, surfaceY + ry)
    top.addColorStop(0, rgba(mix(color, WHITE, 0.42), 1))
    top.addColorStop(0.45, rgba(mix(color, WHITE, 0.1), 1))
    top.addColorStop(1, rgba(mix(color, BLACK, 0.18), 1))
    return top
  })
  ctx.fill()

  // meniscus: liquid climbs the wall, catching a bright line
  ring()
  ctx.strokeStyle = rgba(mix(color, WHITE, 0.5), 0.32)
  ctx.lineWidth = Math.max(0.7, g.wall * 0.42)
  ctx.stroke()

  ctx.globalCompositeOperation = 'lighter'
  const sway = Math.sin(time * 0.7) * half * 0.05
  ctx.beginPath()
  ctx.ellipse(
    g.cx - half * 0.32 + sway,
    surfaceY - ry * 0.25 + surfaceOffset(g, Math.PI * 1.5, time, slosh) * 0.6,
    half * 0.42,
    ry * 0.42,
    -0.2,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = 'rgba(255,246,226,0.24)'
  ctx.fill()

  // a second, tighter glint drifting against the first
  ctx.beginPath()
  ctx.ellipse(
    g.cx + half * (0.3 + Math.sin(time * 0.53) * 0.1),
    surfaceY + ry * 0.18,
    half * 0.17,
    ry * 0.24,
    0.3,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = 'rgba(255,240,210,0.16)'
  ctx.fill()
  ctx.restore()
}

/**
 * The stream falling in from above. `k` is 0..1 stream strength; `headY` is how
 * far the leading edge has travelled, so the first frames show a stream that has
 * not reached the glass yet.
 */
export function drawPourStream(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  k: number,
  headY: number,
  time: number,
) {
  if (k <= 0.01) return
  const startY = g.top - g.bowlH * 0.75
  const endY = Math.min(headY, yAt(g, SURFACE_T) + g.maxHalf * 0.05)
  if (endY <= startY) return

  const x0 = g.cx - g.maxHalf * 0.08
  const w0 = g.maxHalf * 0.115 * k
  const w1 = g.maxHalf * 0.06 * k
  const STEPS = 22
  const at = (i: number) => {
    const u = i / STEPS
    const y = startY + (endY - startY) * u
    const wob = Math.sin(u * 8.5 - time * 13) * g.maxHalf * 0.012 * u
    return { y, x: x0 + wob + u * u * g.maxHalf * 0.07, w: w0 + (w1 - w0) * u }
  }

  ctx.save()
  ctx.beginPath()
  for (let i = 0; i <= STEPS; i++) {
    const p = at(i)
    if (i === 0) ctx.moveTo(p.x - p.w, p.y)
    else ctx.lineTo(p.x - p.w, p.y)
  }
  for (let i = STEPS; i >= 0; i--) {
    const p = at(i)
    ctx.lineTo(p.x + p.w, p.y)
  }
  ctx.closePath()
  // the stream comes from a pot outside the frame, so its top edge has to fade
  // out rather than stop dead on a hard horizontal cut
  const grad = ctx.createLinearGradient(0, startY, 0, endY)
  grad.addColorStop(0, rgba(mix(color, WHITE, 0.35), 0))
  grad.addColorStop(0.12, rgba(mix(color, WHITE, 0.3), 0.5))
  grad.addColorStop(0.34, rgba(mix(color, WHITE, 0.08), 0.9))
  grad.addColorStop(1, rgba(color, 0.98))
  ctx.fillStyle = grad
  ctx.fill()

  // the specular running down the left of the stream
  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()
  for (let i = 0; i <= STEPS; i++) {
    const p = at(i)
    const x = p.x - p.w * 0.45
    if (i === 0) ctx.moveTo(x, p.y)
    else ctx.lineTo(x, p.y)
  }
  const sheen = ctx.createLinearGradient(0, startY, 0, endY)
  sheen.addColorStop(0, 'rgba(255,246,226,0)')
  sheen.addColorStop(0.2, 'rgba(255,246,226,0.5)')
  sheen.addColorStop(1, 'rgba(255,246,226,0.55)')
  ctx.strokeStyle = sheen
  ctx.lineWidth = Math.max(0.8, g.maxHalf * 0.022 * k)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()
}

/**
 * Glass in front of the liquid — wall edges, speculars, rim. None of it depends
 * on the blend, so the engine renders it once per resize into an offscreen layer.
 */
export function drawGlassFront(ctx: CanvasRenderingContext2D, g: Geom) {
  ctx.save()
  ctx.clip(g.outer)
  const walls = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf, 0)
  walls.addColorStop(0, 'rgba(255,244,222,0.3)')
  walls.addColorStop(0.055, 'rgba(30,18,10,0.32)')
  walls.addColorStop(0.13, 'rgba(0,0,0,0)')
  walls.addColorStop(0.87, 'rgba(0,0,0,0)')
  walls.addColorStop(0.95, 'rgba(30,18,10,0.28)')
  walls.addColorStop(1, 'rgba(255,244,222,0.26)')
  ctx.fillStyle = walls
  ctx.fill(g.outer)
  ctx.restore()

  ctx.save()
  ctx.lineWidth = Math.max(0.9, g.wall * 0.42)
  ctx.strokeStyle = 'rgba(246,234,212,0.3)'
  ctx.stroke(g.outer)
  ctx.restore()

  drawSpeculars(ctx, g)
  drawRim(ctx, g)
}

/** Light bending where the liquid line crosses the wall — depends on the blend. */
export function drawRefractionKink(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  fill: number,
  cache: GradCache,
) {
  if (fill <= 0.01) return
  const surfaceT = SURFACE_T * fill
  const surfaceY = yAt(g, surfaceT)
  const half = halfAt(g, surfaceT)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const dir of [-1, 1]) {
    const x = g.cx + dir * half
    ctx.fillStyle = cache.get(`kink${dir}`, () => {
      const grd = ctx.createLinearGradient(x - dir * g.wall * 3, 0, x, 0)
      grd.addColorStop(0, 'rgba(0,0,0,0)')
      grd.addColorStop(1, rgba(mix(color, WHITE, 0.5), 0.5))
      return grd
    })
    ctx.fillRect(Math.min(x, x - dir * g.wall * 3), surfaceY - g.wall * 1.6, g.wall * 3, g.wall * 3.2)
  }
  ctx.restore()
}

function ribbon(g: Geom, t0: number, t1: number, side: -1 | 1, inset: number, width: number): Path2D {
  const p = new Path2D()
  const steps = 26
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * (i / steps)
    const x = g.cx + side * (halfAt(g, t) - inset)
    if (i === 0) p.moveTo(x, yAt(g, t))
    else p.lineTo(x, yAt(g, t))
  }
  for (let i = steps; i >= 0; i--) {
    const k = i / steps
    const t = t0 + (t1 - t0) * k
    const taper = Math.sin(Math.PI * k) ** 0.75
    p.lineTo(g.cx + side * (halfAt(g, t) - inset - width * taper), yAt(g, t))
  }
  p.closePath()
  return p
}

function drawSpeculars(ctx: CanvasRenderingContext2D, g: Geom) {
  ctx.save()
  ctx.clip(g.outer)
  ctx.globalCompositeOperation = 'lighter'

  // key light — bright, narrow, hard-edged
  const key = ribbon(g, 0.07, 0.95, -1, g.wall * 0.9, g.maxHalf * 0.15)
  const keyGrad = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx - g.maxHalf * 0.55, 0)
  keyGrad.addColorStop(0, 'rgba(255,250,238,0.1)')
  keyGrad.addColorStop(0.42, 'rgba(255,252,246,0.92)')
  keyGrad.addColorStop(0.7, 'rgba(255,246,226,0.3)')
  keyGrad.addColorStop(1, 'rgba(255,240,210,0)')
  ctx.fillStyle = keyGrad
  ctx.fill(key)

  // hot core inside the key streak
  const core = ribbon(g, 0.16, 0.82, -1, g.wall * 1.25, g.maxHalf * 0.055)
  ctx.fillStyle = 'rgba(255,253,248,0.85)'
  ctx.fill(core)

  // bounce — broad, dim, warm
  const bounce = ribbon(g, 0.1, 0.9, 1, g.wall * 0.6, g.maxHalf * 0.36)
  const bounceGrad = ctx.createLinearGradient(g.cx + g.maxHalf, 0, g.cx + g.maxHalf * 0.35, 0)
  bounceGrad.addColorStop(0, 'rgba(226,178,116,0.34)')
  bounceGrad.addColorStop(0.5, 'rgba(206,158,98,0.12)')
  bounceGrad.addColorStop(1, 'rgba(190,140,80,0)')
  ctx.fillStyle = bounceGrad
  ctx.fill(bounce)

  ctx.restore()
}

function drawRim(ctx: CanvasRenderingContext2D, g: Geom) {
  const half = g.table[g.table.length - 1]
  const ry = half * 0.2
  ctx.save()

  // dark ring at the top edge — the glass seen through its own thickness
  ctx.beginPath()
  ctx.ellipse(g.cx, g.top, half, ry, 0, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(1.2, g.wall * 1.05)
  const ring = ctx.createLinearGradient(g.cx - half, g.top, g.cx + half, g.top)
  ring.addColorStop(0, 'rgba(255,248,232,0.75)')
  ring.addColorStop(0.2, 'rgba(46,28,16,0.9)')
  ring.addColorStop(0.5, 'rgba(28,16,9,0.95)')
  ring.addColorStop(0.82, 'rgba(52,32,18,0.85)')
  ring.addColorStop(1, 'rgba(236,214,178,0.6)')
  ctx.strokeStyle = ring
  ctx.stroke()

  // lit top face of the rim
  ctx.beginPath()
  ctx.ellipse(g.cx, g.top - g.wall * 0.35, half, ry, 0, Math.PI * 0.98, Math.PI * 1.92)
  ctx.lineWidth = Math.max(0.9, g.wall * 0.55)
  ctx.strokeStyle = 'rgba(255,250,238,0.75)'
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(g.cx, g.top - g.wall * 0.3, half, ry, 0, Math.PI * 0.05, Math.PI * 0.55)
  ctx.strokeStyle = 'rgba(214,178,110,0.4)'
  ctx.lineWidth = Math.max(0.7, g.wall * 0.4)
  ctx.stroke()
  ctx.restore()
}
