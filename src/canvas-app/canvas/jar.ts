import {
  BLACK,
  clampBounds,
  GradCache,
  mix,
  rgba,
  sampleProfile,
  WHITE,
  type Bounds,
} from './paint'

/**
 * The storage jar: a rounded-bottomed glass body tapering to a short neck under
 * a wooden lid, with the dry blend heaped in the bottom.
 *
 * The silhouette is sampled once per resize into a lookup table; the heap
 * layout and every drawing pass read the same table, so leaves can never sit
 * outside the walls.
 */

/**
 * [t, halfWidth] up the body — t=0 the base, t=1 the neck rim.
 * A full round belly low down (widest at a quarter of the height), then a long
 * near-straight taper up to a neck a little over half the belly's width. The
 * low belly and the straight taper are what separate a tea jar from a vase.
 */
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.02, 0.46],
  [0.05, 0.66],
  [0.09, 0.82],
  [0.14, 0.925],
  [0.19, 0.98],
  [0.25, 1.0],
  [0.33, 0.986],
  [0.42, 0.952],
  [0.52, 0.903],
  [0.62, 0.848],
  [0.72, 0.784],
  [0.8, 0.727],
  [0.87, 0.674],
  [0.92, 0.64],
  [0.96, 0.618],
  [1.0, 0.6],
]

const SAMPLES = 160

/** How high the 100 g heap stands, as a fraction of the body height. */
export const PILE_T = 0.21

/** How far the lid rises while the jar is being filled. */
export const LID_LIFT = 0.17

export interface Geom {
  w: number
  h: number
  cx: number
  /** y of the base (t=0), which is also where the jar meets the table */
  bottom: number
  /** y of the neck rim (t=1) */
  top: number
  bodyH: number
  maxHalf: number
  wall: number
  neckHalf: number
  lidHalf: number
  lidH: number
  pileH: number
  table: number[]
  outer: Path2D
  inner: Path2D
  /** the heap's region, clipped so stray leaves cannot escape the walls */
  pileClip: Path2D
  /** the point pinned to the on-screen placement anchor */
  anchorX: number
  anchorY: number
  backBounds: Bounds
  frontBounds: Bounds
}

export function halfAt(g: Geom, t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return g.table[SAMPLES]
  const f = t * SAMPLES
  const i = Math.floor(f)
  return g.table[i] + (g.table[i + 1] - g.table[i]) * (f - i)
}

export function yAt(g: Geom, t: number): number {
  return g.bottom - t * g.bodyH
}

export function tAtY(g: Geom, y: number): number {
  return (g.bottom - y) / g.bodyH
}

/** Room for a leaf at this height, walls and the leaf's own size allowed for. */
export function innerHalfAtY(g: Geom, y: number, pad = 0): number {
  return Math.max(0, halfAt(g, tAtY(g, y)) - g.wall - pad)
}

/**
 * Top of the heap at horizontal offset `u` (-1..1 of the available width).
 * A heap does not fill flat to the walls — it domes, and that dome is most of
 * what makes a pile of leaves read as loose rather than packed.
 */
export function pileTopY(g: Geom, u: number): number {
  return g.bottom - g.pileH * (1 - u * u) ** 0.6
}

function bodyPath(g: Geom, inset: number): Path2D {
  const p = new Path2D()
  for (let i = 0; i <= SAMPLES; i++) {
    const half = Math.max(0, g.table[i] - inset)
    const y = g.bottom - (i / SAMPLES) * g.bodyH
    if (i === 0) p.moveTo(g.cx, y)
    else p.lineTo(g.cx + half, y)
  }
  for (let i = SAMPLES; i >= 0; i--) {
    const half = Math.max(0, g.table[i] - inset)
    p.lineTo(g.cx - half, g.bottom - (i / SAMPLES) * g.bodyH)
  }
  p.closePath()
  return p
}

export function computeGeom(w: number, h: number): Geom {
  const cx = w / 2
  const bottom = h * 0.895
  const bodyH = Math.min(h * 0.62, w * 1.0)
  const maxHalf = bodyH * 0.46
  const top = bottom - bodyH

  const table: number[] = []
  for (let i = 0; i <= SAMPLES; i++) table.push(sampleProfile(PROFILE, i / SAMPLES) * maxHalf)

  const g: Geom = {
    w,
    h,
    cx,
    bottom,
    top,
    bodyH,
    maxHalf,
    wall: Math.max(1.4, maxHalf * 0.038),
    neckHalf: table[SAMPLES],
    lidHalf: table[SAMPLES] * 1.12,
    lidH: bodyH * 0.078,
    pileH: bodyH * PILE_T,
    table,
    outer: new Path2D(),
    inner: new Path2D(),
    pileClip: new Path2D(),
    anchorX: cx,
    anchorY: 0,
    backBounds: { x: 0, y: 0, w, h },
    frontBounds: { x: 0, y: 0, w, h },
  }

  g.outer = bodyPath(g, 0)
  g.inner = bodyPath(g, g.wall)
  // the anchor sits between the lifted lid and the table, so the jar stays
  // centred in its box whether the lid is up or down
  g.anchorY = (top - g.lidH + bottom) / 2 + bodyH * 0.06

  // clipped every frame, so it is sampled coarsely — the profile is smooth
  // enough that a quarter of the points is visually identical
  const pc = new Path2D()
  const stride = 4
  const iTop = Math.min(SAMPLES, Math.ceil((PILE_T * 1.9 * SAMPLES) / stride) * stride)
  pc.moveTo(cx, bottom)
  for (let i = 0; i <= iTop; i += stride)
    pc.lineTo(cx + Math.max(0, g.table[i] - g.wall), bottom - (i / SAMPLES) * bodyH)
  for (let i = iTop; i >= 0; i -= stride)
    pc.lineTo(cx - Math.max(0, g.table[i] - g.wall), bottom - (i / SAMPLES) * bodyH)
  pc.closePath()
  g.pileClip = pc

  g.backBounds = clampBounds(
    {
      x: cx - maxHalf * 2.5,
      y: top - g.maxHalf * 0.2,
      w: maxHalf * 5,
      h: bottom + bodyH * 0.35 - (top - g.maxHalf * 0.2),
    },
    w,
    h,
  )
  g.frontBounds = clampBounds(
    {
      x: cx - maxHalf * 1.1,
      y: top - g.maxHalf * 0.12,
      w: maxHalf * 2.2,
      h: bottom + g.wall * 3 - (top - g.maxHalf * 0.12),
    },
    w,
    h,
  )

  return g
}

// ------------------------------------------------------------------ the table

export function drawTable(ctx: CanvasRenderingContext2D, g: Geom, blob: HTMLCanvasElement) {
  const { cx, bottom, maxHalf } = g

  ctx.save()

  // the surface the jar stands on, fading out sideways
  const plane = ctx.createLinearGradient(0, bottom - maxHalf * 0.05, 0, bottom + maxHalf * 1.1)
  plane.addColorStop(0, 'rgba(60,42,26,0.5)')
  plane.addColorStop(0.35, 'rgba(38,26,16,0.42)')
  plane.addColorStop(1, 'rgba(16,10,6,0)')
  ctx.fillStyle = plane
  ctx.fillRect(cx - maxHalf * 3, bottom - maxHalf * 0.05, maxHalf * 6, maxHalf * 1.2)

  // the weave: a few crossing threads, just enough to read as matting
  ctx.save()
  ctx.beginPath()
  ctx.rect(cx - maxHalf * 2.6, bottom - maxHalf * 0.02, maxHalf * 5.2, maxHalf * 0.62)
  ctx.clip()
  ctx.strokeStyle = 'rgba(150,116,66,0.09)'
  ctx.lineWidth = Math.max(0.6, maxHalf * 0.018)
  for (let i = 0; i < 9; i++) {
    const y = bottom + maxHalf * (0.03 + i * 0.075)
    ctx.beginPath()
    ctx.moveTo(cx - maxHalf * 2.6, y)
    ctx.lineTo(cx + maxHalf * 2.6, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.6
  for (let i = -7; i <= 7; i++) {
    const x = cx + i * maxHalf * 0.34
    ctx.beginPath()
    ctx.moveTo(x, bottom)
    ctx.lineTo(x + maxHalf * 0.16, bottom + maxHalf * 0.62)
    ctx.stroke()
  }
  ctx.restore()

  // contact shadow, thrown to the right of the key light
  ctx.save()
  const rx = maxHalf * 2.1
  const ry = rx * 0.3
  ctx.translate(cx + maxHalf * 0.16, bottom + maxHalf * 0.06)
  ctx.scale(1, ry / rx)
  ctx.globalAlpha = 0.85
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(blob, -rx, -rx, rx * 2, rx * 2)
  ctx.restore()

  // a tight dark core right where the glass touches
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.ellipse(cx, bottom + maxHalf * 0.012, maxHalf * 0.62, maxHalf * 0.09, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(4,2,1,0.85)'
  ctx.fill()
  ctx.restore()

  ctx.restore()
}

/** Light gathered by the glass and pooled on the table beside it. */
export function drawCausticPool(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  fill: number,
  blob: HTMLCanvasElement,
  time: number,
) {
  if (fill <= 0.02) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  const rx = g.maxHalf * 1.5
  const ry = rx * 0.24
  ctx.globalAlpha = 0.24 * fill
  ctx.save()
  ctx.translate(g.cx + g.maxHalf * 0.5, g.bottom + g.maxHalf * 0.07)
  ctx.scale(1, ry / rx)
  ctx.drawImage(blob, -rx, -rx, rx * 2, rx * 2)
  ctx.restore()

  // a brighter core that wanders, so the pool is never quite still
  for (let i = 0; i < 2; i++) {
    const wob = Math.sin(time * 0.38 + i * 2.1) * g.maxHalf * 0.06
    const cr = g.maxHalf * (0.5 - i * 0.18)
    ctx.globalAlpha = fill * (0.16 + i * 0.1)
    ctx.save()
    ctx.translate(g.cx + g.maxHalf * (0.38 + i * 0.1) + wob, g.bottom + g.maxHalf * 0.05)
    ctx.scale(1, 0.24)
    ctx.drawImage(blob, -cr, -cr, cr * 2, cr * 2)
    ctx.restore()
  }
  ctx.restore()
  void color
}

/** The warm bloom the filled jar throws into the room. */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  fill: number,
  blob: HTMLCanvasElement,
) {
  if (fill <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.13 * fill
  const r = g.maxHalf * 3.2
  const cy = g.bottom - g.bodyH * 0.16
  ctx.drawImage(blob, g.cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
}

// -------------------------------------------------------------------- the jar

/** Back wall and the shaded interior, seen through the front of the glass. */
export function drawJarBack(ctx: CanvasRenderingContext2D, g: Geom) {
  ctx.save()
  ctx.fillStyle = 'rgba(226,214,192,0.03)'
  ctx.fill(g.outer)

  ctx.save()
  ctx.clip(g.outer)

  // the interior falls away into shadow towards the top and the right
  const inside = ctx.createLinearGradient(g.cx - g.maxHalf, g.top, g.cx + g.maxHalf, g.bottom)
  inside.addColorStop(0, 'rgba(52,38,24,0.3)')
  inside.addColorStop(0.5, 'rgba(26,17,10,0.3)')
  inside.addColorStop(1, 'rgba(22,13,7,0.28)')
  ctx.fillStyle = inside
  ctx.fill(g.outer)

  // the far wall catching light from behind
  const side = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf, 0)
  side.addColorStop(0, 'rgba(244,232,208,0.16)')
  side.addColorStop(0.14, 'rgba(244,232,208,0.03)')
  side.addColorStop(0.5, 'rgba(0,0,0,0)')
  side.addColorStop(0.88, 'rgba(236,222,198,0.05)')
  side.addColorStop(1, 'rgba(236,222,198,0.18)')
  ctx.fillStyle = side
  ctx.fill(g.outer)

  // the thick base acts as a lens and stays bright even when the jar is empty
  ctx.globalCompositeOperation = 'lighter'
  const lens = ctx.createRadialGradient(
    g.cx,
    g.bottom - g.maxHalf * 0.14,
    0,
    g.cx,
    g.bottom - g.maxHalf * 0.14,
    g.maxHalf * 1.05,
  )
  lens.addColorStop(0, 'rgba(255,236,204,0.13)')
  lens.addColorStop(1, 'rgba(255,228,188,0)')
  ctx.fillStyle = lens
  ctx.fill(g.outer)

  // the inside of the far wall where it meets the base, seen through the glass
  ctx.globalCompositeOperation = 'source-over'
  const floorY = yAt(g, 0.045)
  ctx.beginPath()
  ctx.ellipse(g.cx, floorY, halfAt(g, 0.045) - g.wall, g.maxHalf * 0.17, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,240,214,0.1)'
  ctx.lineWidth = Math.max(0.7, g.wall * 0.5)
  ctx.stroke()
  ctx.restore()
  ctx.restore()
}

function ribbon(g: Geom, t0: number, t1: number, side: -1 | 1, inset: number, width: number) {
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

/** Front wall, speculars and the neck rim — none of it depends on the blend. */
export function drawJarFront(ctx: CanvasRenderingContext2D, g: Geom) {
  ctx.save()
  ctx.clip(g.outer)
  const walls = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf, 0)
  walls.addColorStop(0, 'rgba(255,246,226,0.24)')
  walls.addColorStop(0.05, 'rgba(28,17,9,0.3)')
  walls.addColorStop(0.12, 'rgba(0,0,0,0)')
  walls.addColorStop(0.88, 'rgba(0,0,0,0)')
  walls.addColorStop(0.955, 'rgba(28,17,9,0.26)')
  walls.addColorStop(1, 'rgba(255,246,226,0.22)')
  ctx.fillStyle = walls
  ctx.fill(g.outer)
  ctx.restore()

  ctx.save()
  ctx.lineWidth = Math.max(0.9, g.wall * 0.42)
  ctx.strokeStyle = 'rgba(244,232,210,0.26)'
  ctx.stroke(g.outer)
  ctx.restore()

  ctx.save()
  ctx.clip(g.outer)
  ctx.globalCompositeOperation = 'lighter'

  // key light — a narrow hard streak down the left shoulder
  const key = ribbon(g, 0.04, 0.97, -1, g.wall * 0.85, g.maxHalf * 0.13)
  const keyGrad = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx - g.maxHalf * 0.6, 0)
  keyGrad.addColorStop(0, 'rgba(255,250,238,0.08)')
  keyGrad.addColorStop(0.44, 'rgba(255,252,246,0.85)')
  keyGrad.addColorStop(0.72, 'rgba(255,246,226,0.26)')
  keyGrad.addColorStop(1, 'rgba(255,240,210,0)')
  ctx.fillStyle = keyGrad
  ctx.fill(key)

  const core = ribbon(g, 0.12, 0.86, -1, g.wall * 1.2, g.maxHalf * 0.05)
  ctx.fillStyle = 'rgba(255,253,248,0.8)'
  ctx.fill(core)

  // bounce — broad, dim, warm
  const bounce = ribbon(g, 0.06, 0.92, 1, g.wall * 0.55, g.maxHalf * 0.3)
  const bounceGrad = ctx.createLinearGradient(g.cx + g.maxHalf, 0, g.cx + g.maxHalf * 0.4, 0)
  bounceGrad.addColorStop(0, 'rgba(224,176,114,0.3)')
  bounceGrad.addColorStop(0.5, 'rgba(204,156,96,0.1)')
  bounceGrad.addColorStop(1, 'rgba(188,138,78,0)')
  ctx.fillStyle = bounceGrad
  ctx.fill(bounce)
  ctx.restore()

  drawNeckRim(ctx, g)
}

function drawNeckRim(ctx: CanvasRenderingContext2D, g: Geom) {
  const half = g.neckHalf
  const ry = half * 0.24
  ctx.save()

  // the glass seen end-on through its own thickness
  ctx.beginPath()
  ctx.ellipse(g.cx, g.top, half, ry, 0, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(1.2, g.wall * 1.15)
  const ring = ctx.createLinearGradient(g.cx - half, 0, g.cx + half, 0)
  ring.addColorStop(0, 'rgba(255,248,232,0.7)')
  ring.addColorStop(0.22, 'rgba(44,28,16,0.85)')
  ring.addColorStop(0.5, 'rgba(26,15,8,0.9)')
  ring.addColorStop(0.8, 'rgba(50,31,17,0.8)')
  ring.addColorStop(1, 'rgba(232,210,174,0.55)')
  ctx.strokeStyle = ring
  ctx.stroke()

  // lit top face of the rim
  ctx.beginPath()
  ctx.ellipse(g.cx, g.top - g.wall * 0.3, half, ry, 0, Math.PI * 1.0, Math.PI * 1.9)
  ctx.lineWidth = Math.max(0.9, g.wall * 0.5)
  ctx.strokeStyle = 'rgba(255,250,238,0.6)'
  ctx.stroke()
  ctx.restore()
}

/** The dark seal that sits inside the neck under the lid. */
export function drawGasket(ctx: CanvasRenderingContext2D, g: Geom) {
  const half = g.neckHalf - g.wall * 1.3
  const ry = half * 0.24
  const depth = g.bodyH * 0.055
  const yTop = g.top + g.wall * 0.4

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(g.cx - half, yTop)
  ctx.lineTo(g.cx - half, yTop + depth)
  ctx.ellipse(g.cx, yTop + depth, half, ry, 0, Math.PI, 0, true)
  ctx.lineTo(g.cx + half, yTop)
  ctx.closePath()
  const band = ctx.createLinearGradient(g.cx - half, 0, g.cx + half, 0)
  band.addColorStop(0, 'rgba(58,40,26,0.95)')
  band.addColorStop(0.3, 'rgba(22,13,7,0.98)')
  band.addColorStop(0.75, 'rgba(30,19,10,0.96)')
  band.addColorStop(1, 'rgba(70,50,32,0.9)')
  ctx.fillStyle = band
  ctx.fill()

  // its lower lip catches a little light from inside the jar
  ctx.beginPath()
  ctx.ellipse(g.cx, yTop + depth, half, ry, 0, Math.PI * 0.12, Math.PI * 0.88)
  ctx.strokeStyle = 'rgba(180,142,92,0.25)'
  ctx.lineWidth = Math.max(0.7, g.wall * 0.4)
  ctx.stroke()
  ctx.restore()
}

/**
 * The wooden lid. `lift` is 0..1 of LID_LIFT; it also tips as it rises, the way
 * a lid does when it is lifted by one edge.
 */
export function drawLid(ctx: CanvasRenderingContext2D, g: Geom, lift: number, set = 0) {
  const half = g.lidHalf * (1 - set * 0.1)
  const ry = half * (0.24 + set * 0.1)
  const rise = lift * g.bodyH * LID_LIFT
  // moving the lid aside arcs it over rather than sliding it through the glass
  const arc = Math.sin(set * Math.PI) * g.bodyH * 0.2
  const restY = g.bottom - g.lidH * 0.2
  const x = g.cx + set * g.maxHalf * 1.62 - lift * g.maxHalf * 0.18
  const y = g.top + (restY - g.top) * set - rise - arc
  const tilt = lift * 0.3 + set * 0.16

  ctx.save()

  // where it comes to rest on the table it needs its own contact shadow
  if (set > 0.4) {
    ctx.save()
    ctx.globalAlpha = (set - 0.4) / 0.6
    ctx.globalCompositeOperation = 'multiply'
    ctx.beginPath()
    ctx.ellipse(x + half * 0.16, restY + g.lidH * 0.34, half * 1.15, ry * 0.75, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(6,3,1,0.7)'
    ctx.fill()
    ctx.restore()
  }

  ctx.translate(x, y)
  ctx.rotate(-tilt)
  // beside the jar it sits out of the key light
  ctx.globalAlpha = 1 - set * 0.14

  const topY = -g.lidH

  // the shadow the lid casts down into the neck as it comes off
  if (lift > 0.02 && set < 0.2) {
    ctx.save()
    ctx.globalAlpha = 0.5 * (1 - lift)
    ctx.beginPath()
    ctx.ellipse(0, rise * 0.98, half * 0.9, ry * 0.9, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fill()
    ctx.restore()
  }

  // side band
  ctx.beginPath()
  ctx.moveTo(-half, topY)
  ctx.lineTo(-half, 0)
  ctx.ellipse(0, 0, half, ry, 0, Math.PI, 0, true)
  ctx.lineTo(half, topY)
  ctx.closePath()
  const side = ctx.createLinearGradient(-half, 0, half, 0)
  side.addColorStop(0, '#6f4a2b')
  side.addColorStop(0.16, '#8a5c34')
  side.addColorStop(0.45, '#5b3a20')
  side.addColorStop(0.78, '#3c2513')
  side.addColorStop(1, '#563720')
  ctx.fillStyle = side
  ctx.fill()

  // top face
  ctx.beginPath()
  ctx.ellipse(0, topY, half, ry, 0, 0, Math.PI * 2)
  const face = ctx.createLinearGradient(-half * 0.7, topY - ry, half * 0.8, topY + ry)
  face.addColorStop(0, '#a07249')
  face.addColorStop(0.35, '#815733')
  face.addColorStop(0.72, '#653f22')
  face.addColorStop(1, '#4c2f18')
  ctx.fillStyle = face
  ctx.fill()

  // grain: arcs across the face, then the growth rings around an off-centre
  // heart — flat-sawn timber never has its rings in the middle
  ctx.save()
  ctx.clip()
  ctx.lineCap = 'round'
  for (let i = -3; i <= 3; i++) {
    const off = i * ry * 0.42
    ctx.beginPath()
    ctx.moveTo(-half, topY + off)
    ctx.quadraticCurveTo(0, topY + off - ry * 0.3, half, topY + off + ry * 0.12)
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(74,46,24,0.32)' : 'rgba(206,158,104,0.16)'
    ctx.lineWidth = Math.max(0.6, ry * (i % 2 === 0 ? 0.09 : 0.055))
    ctx.stroke()
  }
  const hx = -half * 0.28
  const hy = topY + ry * 0.16
  for (let i = 1; i <= 5; i++) {
    const r = half * (0.1 + i * 0.15)
    ctx.beginPath()
    ctx.ellipse(hx, hy, r, r * 0.24, 0.08, 0, Math.PI * 2)
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(62,38,19,0.22)' : 'rgba(198,150,98,0.11)'
    ctx.lineWidth = Math.max(0.5, ry * 0.05)
    ctx.stroke()
  }
  ctx.restore()

  // the lit lip where the top face meets the side
  ctx.beginPath()
  ctx.ellipse(0, topY, half, ry, 0, Math.PI * 0.98, Math.PI * 1.88)
  ctx.strokeStyle = 'rgba(238,196,144,0.55)'
  ctx.lineWidth = Math.max(0.8, ry * 0.11)
  ctx.stroke()

  // and the dark underside of the bottom edge
  ctx.beginPath()
  ctx.ellipse(0, 0, half, ry, 0, Math.PI * 0.06, Math.PI * 0.94)
  ctx.strokeStyle = 'rgba(28,16,8,0.5)'
  ctx.lineWidth = Math.max(0.8, ry * 0.1)
  ctx.stroke()

  ctx.restore()
}

/** The paper label, carrying whatever the blend has been named. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  name: string,
  color: [number, number, number],
) {
  const text = name.trim() || 'Fərdi qarışıq'
  const w = g.maxHalf * 1.06
  const h = g.maxHalf * 0.44
  const cy = yAt(g, 0.5)
  const x = g.cx - w / 2
  const y = cy - h / 2

  ctx.save()
  // sits behind the front wall's specular, so it reads as being under glass
  ctx.globalAlpha = 0.88
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h * 0.06)
  const paper = ctx.createLinearGradient(x, y, x + w, y + h)
  paper.addColorStop(0, '#e4d5b8')
  paper.addColorStop(0.5, '#d5c3a1')
  paper.addColorStop(1, '#b9a481')
  ctx.fillStyle = paper
  ctx.fill()

  ctx.strokeStyle = rgba(mix(color, BLACK, 0.35), 0.5)
  ctx.lineWidth = Math.max(0.7, g.maxHalf * 0.012)
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(x + h * 0.1, y + h * 0.1, w - h * 0.2, h - h * 0.2, h * 0.04)
  ctx.strokeStyle = rgba(mix(color, BLACK, 0.2), 0.28)
  ctx.lineWidth = Math.max(0.5, g.maxHalf * 0.007)
  ctx.stroke()

  ctx.fillStyle = 'rgba(46,30,16,0.88)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let size = h * 0.34
  ctx.font = `400 ${size}px "Source Serif 4", Georgia, serif`
  // long names shrink rather than spill over the edge of the paper
  while (ctx.measureText(text).width > w * 0.82 && size > h * 0.15) {
    size *= 0.92
    ctx.font = `400 ${size}px "Source Serif 4", Georgia, serif`
  }
  ctx.fillText(text, g.cx, cy - h * 0.06)

  ctx.font = `500 ${h * 0.15}px "Inter", system-ui, sans-serif`
  ctx.fillStyle = 'rgba(74,50,28,0.62)'
  ctx.fillText('100 q · ÖZ ÇAYIN', g.cx, cy + h * 0.26)

  // a highlight raking across the paper, from the same key light as the glass
  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h * 0.06)
  const sheen = ctx.createLinearGradient(x, y, x + w * 0.6, y + h)
  sheen.addColorStop(0, 'rgba(255,250,236,0.22)')
  sheen.addColorStop(0.5, 'rgba(255,250,236,0.02)')
  sheen.addColorStop(1, 'rgba(255,250,236,0)')
  ctx.fillStyle = sheen
  ctx.fill()
  ctx.restore()
}

/** A band of light sweeping the glass when the recipe changes. */
export function drawSheen(ctx: CanvasRenderingContext2D, g: Geom, k: number) {
  if (k <= 0.01) return
  const span = g.bodyH * 1.5
  const y = g.top - g.bodyH * 0.25 + (1 - k) * span

  ctx.save()
  ctx.clip(g.outer)
  ctx.globalCompositeOperation = 'lighter'
  const grad = ctx.createLinearGradient(0, y - g.bodyH * 0.2, 0, y + g.bodyH * 0.14)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.55, `rgba(255,244,220,${0.16 * k})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(g.cx - g.maxHalf * 1.1, y - g.bodyH * 0.2, g.maxHalf * 2.2, g.bodyH * 0.34)
  ctx.restore()
}

/** Shadow the heap casts on the glass right around and under itself. */
export function drawPileShade(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  fill: number,
  level: number,
) {
  if (fill <= 0.02 || level <= 0.01) return
  const pileH = level * g.bodyH
  const topY = g.bottom - pileH
  ctx.save()
  ctx.clip(g.inner)

  const grad = ctx.createLinearGradient(0, topY - pileH * 0.3, 0, g.bottom)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.55, rgba(mix(color, BLACK, 0.72), 0.16 * fill))
  grad.addColorStop(1, rgba(mix(color, BLACK, 0.8), 0.38 * fill))
  ctx.fillStyle = grad
  ctx.fillRect(g.cx - g.maxHalf * 1.2, topY - pileH * 0.3, g.maxHalf * 2.4, pileH * 1.4)

  // the heap catches the key light along its left flank
  ctx.globalCompositeOperation = 'lighter'
  const lit = ctx.createLinearGradient(g.cx - g.maxHalf, 0, g.cx + g.maxHalf * 0.2, 0)
  lit.addColorStop(0, rgba(mix(color, WHITE, 0.55), 0.26 * fill))
  lit.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lit
  ctx.fillRect(g.cx - g.maxHalf * 1.2, topY - pileH * 0.3, g.maxHalf * 2.4, pileH * 1.4)
  ctx.restore()
}

export { GradCache }
