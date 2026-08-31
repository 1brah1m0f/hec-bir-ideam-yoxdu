import type { ShapeKind } from '../../shared/types'

/**
 * Every shape draws centred on the origin inside a box of roughly [-s, s].
 * The caller has already translated, rotated and set globalAlpha.
 */
type Draw = (ctx: CanvasRenderingContext2D, s: number, seed: number) => void

function frac(seed: number, n: number) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const teaLeaf =
  (dark: string, light: string, curl: number): Draw =>
  (ctx, s, seed) => {
    const w = s * 0.34
    const bend = curl * (0.7 + frac(seed, 1) * 0.6)
    ctx.beginPath()
    ctx.moveTo(-s * 0.9, 0)
    ctx.quadraticCurveTo(-s * 0.1, -s * bend, s * 0.55, -s * bend * 0.35)
    ctx.quadraticCurveTo(s * 0.95, 0, s * 0.6, s * 0.2)
    ctx.quadraticCurveTo(-s * 0.1, -s * bend * 0.35 + w, -s * 0.9, w * 0.6)
    ctx.closePath()
    ctx.fillStyle = dark
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(-s * 0.7, w * 0.1)
    ctx.quadraticCurveTo(-s * 0.05, -s * bend * 0.55, s * 0.5, -s * bend * 0.2)
    ctx.strokeStyle = light
    ctx.lineWidth = Math.max(0.6, s * 0.09)
    ctx.lineCap = 'round'
    ctx.stroke()
  }

const DRAWERS: Record<ShapeKind, Draw> = {
  'tea-black': teaLeaf('#412615', '#7a4b28', 0.55),
  'tea-green': teaLeaf('#4b5a28', '#86944a', 0.3),
  'tea-white': (ctx, s, seed) => {
    ctx.beginPath()
    ctx.moveTo(-s * 0.85, 0)
    ctx.quadraticCurveTo(0, -s * 0.3, s * 0.85, 0)
    ctx.quadraticCurveTo(0, s * 0.3, -s * 0.85, 0)
    ctx.closePath()
    ctx.fillStyle = '#8f8461'
    ctx.fill()
    ctx.strokeStyle = 'rgba(226,220,200,0.8)'
    ctx.lineWidth = Math.max(0.5, s * 0.08)
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(-s * 0.5 + i * s * 0.35, -s * 0.12 - frac(seed, i) * s * 0.1)
      ctx.lineTo(-s * 0.2 + i * s * 0.35, -s * 0.3 - frac(seed, i + 5) * s * 0.15)
      ctx.stroke()
    }
  },

  thyme: (ctx, s, seed) => {
    ctx.strokeStyle = '#6b7340'
    ctx.lineWidth = Math.max(0.7, s * 0.11)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-s, s * 0.1)
    ctx.quadraticCurveTo(0, -s * 0.18, s, s * 0.05)
    ctx.stroke()
    ctx.fillStyle = '#7e8a4a'
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      const px = -s + t * 2 * s
      const py = s * 0.1 + (-s * 0.28 - s * 0.05) * (t * (1 - t) * 4) * 0.5
      const side = i % 2 === 0 ? -1 : 1
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(side * (0.7 + frac(seed, i) * 0.5))
      ctx.beginPath()
      ctx.ellipse(0, -s * 0.16, s * 0.09, s * 0.24, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  },

  mint: (ctx, s) => {
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.95)
    ctx.bezierCurveTo(s * 0.7, -s * 0.6, s * 0.62, s * 0.55, 0, s * 0.95)
    ctx.bezierCurveTo(-s * 0.62, s * 0.55, -s * 0.7, -s * 0.6, 0, -s * 0.95)
    ctx.closePath()
    ctx.fillStyle = '#4f7f4a'
    ctx.fill()
    ctx.strokeStyle = 'rgba(24,58,28,0.75)'
    ctx.lineWidth = Math.max(0.5, s * 0.07)
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.85)
    ctx.lineTo(0, s * 0.85)
    ctx.stroke()
    ctx.lineWidth = Math.max(0.4, s * 0.05)
    for (let i = -1; i <= 1; i++) {
      const y = i * s * 0.4
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(s * 0.42, y + s * 0.26)
      ctx.moveTo(0, y)
      ctx.lineTo(-s * 0.42, y + s * 0.26)
      ctx.stroke()
    }
  },

  chamomile: (ctx, s, seed) => {
    const petals = 9
    ctx.fillStyle = '#e6dcc2'
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + frac(seed, 0) * 0.4
      ctx.save()
      ctx.rotate(a)
      ctx.beginPath()
      ctx.ellipse(0, -s * 0.62, s * 0.17, s * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2)
    ctx.fillStyle = '#d8a933'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-s * 0.1, -s * 0.1, s * 0.16, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,225,150,0.7)'
    ctx.fill()
  },

  melissa: (ctx, s) => {
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.9)
    ctx.bezierCurveTo(s * 0.95, -s * 0.5, s * 0.7, s * 0.7, 0, s * 0.9)
    ctx.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.95, -s * 0.5, 0, -s * 0.9)
    ctx.closePath()
    ctx.fillStyle = '#7d9450'
    ctx.fill()
    ctx.strokeStyle = 'rgba(46,66,32,0.6)'
    ctx.lineWidth = Math.max(0.5, s * 0.07)
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.8)
    ctx.lineTo(0, s * 0.8)
    ctx.stroke()
  },

  lavender: (ctx, s, seed) => {
    ctx.strokeStyle = '#6f7a4e'
    ctx.lineWidth = Math.max(0.6, s * 0.09)
    ctx.beginPath()
    ctx.moveTo(0, s)
    ctx.quadraticCurveTo(s * 0.1, s * 0.2, 0, -s * 0.2)
    ctx.stroke()
    for (let i = 0; i < 7; i++) {
      const t = i / 6
      const y = -s * 0.2 - t * s * 0.75
      const side = i % 2 === 0 ? -1 : 1
      ctx.beginPath()
      ctx.ellipse(
        side * s * 0.16 * (1 - t * 0.6),
        y,
        s * 0.17 * (1 - t * 0.4),
        s * 0.13 * (1 - t * 0.4),
        side * 0.5,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = i % 3 === 0 ? '#8f7ab4' : '#7a659f'
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(-s * 0.05, -s * 0.85, s * 0.09, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200,186,224,0.8)'
    ctx.fill()
    void seed
  },

  'mountain-tea': (ctx, s, seed) => {
    ctx.strokeStyle = '#9a9a6d'
    ctx.lineWidth = Math.max(0.7, s * 0.1)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-s * 0.15, s)
    ctx.quadraticCurveTo(s * 0.15, 0, -s * 0.05, -s)
    ctx.stroke()
    ctx.fillStyle = '#b3b184'
    for (let i = 0; i < 5; i++) {
      const t = i / 4
      const y = s - t * 2 * s
      const side = i % 2 === 0 ? -1 : 1
      ctx.save()
      ctx.translate(side * s * 0.1, y)
      ctx.rotate(side * (1.0 + frac(seed, i) * 0.3))
      ctx.beginPath()
      ctx.ellipse(side * s * 0.22, 0, s * 0.3, s * 0.08, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  },

  apple: (ctx, s) => {
    ctx.beginPath()
    ctx.moveTo(-s * 0.9, s * 0.35)
    ctx.quadraticCurveTo(-s * 0.95, -s * 0.55, 0, -s * 0.75)
    ctx.quadraticCurveTo(s * 0.95, -s * 0.55, s * 0.9, s * 0.35)
    ctx.quadraticCurveTo(0, s * 0.72, -s * 0.9, s * 0.35)
    ctx.closePath()
    ctx.fillStyle = 'rgba(212,157,88,0.85)'
    ctx.fill()
    ctx.strokeStyle = '#a5622c'
    ctx.lineWidth = Math.max(0.7, s * 0.11)
    ctx.beginPath()
    ctx.moveTo(-s * 0.9, s * 0.35)
    ctx.quadraticCurveTo(0, s * 0.72, s * 0.9, s * 0.35)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, s * 0.02, s * 0.2, s * 0.14, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(120,72,32,0.55)'
    ctx.fill()
  },

  cornel: (ctx, s, seed) => {
    // dried cornel: an oblong berry that has collapsed into wrinkled folds
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.9)
    ctx.bezierCurveTo(s * 0.5, -s * 0.6, s * 0.42, s * 0.55, 0, s * 0.9)
    ctx.bezierCurveTo(-s * 0.44, s * 0.55, -s * 0.52, -s * 0.6, 0, -s * 0.9)
    ctx.closePath()
    ctx.fillStyle = '#7a1c24'
    ctx.fill()

    ctx.strokeStyle = 'rgba(40,8,12,0.75)'
    ctx.lineWidth = Math.max(0.4, s * 0.055)
    for (let i = 0; i < 3; i++) {
      const y = -s * 0.45 + i * s * 0.45 + (frac(seed, i) - 0.5) * s * 0.15
      ctx.beginPath()
      ctx.moveTo(-s * 0.34, y)
      ctx.quadraticCurveTo(0, y + s * 0.12, s * 0.32, y - s * 0.04)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(-s * 0.1, -s * 0.85)
    ctx.quadraticCurveTo(s * 0.16, 0, -s * 0.06, s * 0.85)
    ctx.strokeStyle = 'rgba(178,72,70,0.35)'
    ctx.stroke()
  },

  rosehip: (ctx, s) => {
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.62, s * 0.82, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#b2402c'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-s * 0.2, -s * 0.3, s * 0.18, s * 0.26, -0.35, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(238,150,110,0.45)'
    ctx.fill()
    ctx.strokeStyle = '#5e2113'
    ctx.lineWidth = Math.max(0.6, s * 0.09)
    ctx.lineCap = 'round'
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.72)
      ctx.lineTo(i * s * 0.28, -s * 1.0)
      ctx.stroke()
    }
  },

  'orange-peel': (ctx, s) => {
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.75, -0.4, Math.PI * 1.25)
    ctx.arc(0, 0, s * 0.4, Math.PI * 1.25, -0.4, true)
    ctx.closePath()
    ctx.fillStyle = '#d1782c'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.47, Math.PI * 1.25, -0.4, true)
    ctx.strokeStyle = 'rgba(240,220,182,0.8)'
    ctx.lineWidth = Math.max(0.8, s * 0.14)
    ctx.stroke()
  },

  cinnamon: (ctx, s, seed) => {
    const bow = (frac(seed, 3) - 0.5) * s * 0.3
    const h1 = s * 0.3
    const h2 = s * 0.2

    ctx.beginPath()
    ctx.moveTo(-s * 0.95, -h1)
    ctx.quadraticCurveTo(0, -h1 * 0.7 + bow, s * 0.95, -h2)
    ctx.lineTo(s * 0.95, h2)
    ctx.quadraticCurveTo(0, h1 * 0.9 + bow, -s * 0.95, h1)
    ctx.closePath()
    ctx.fillStyle = '#79401e'
    ctx.fill()

    // the curl of bark catches light along its upper edge
    ctx.beginPath()
    ctx.moveTo(-s * 0.9, -h1 * 0.82)
    ctx.quadraticCurveTo(0, -h1 * 0.55 + bow, s * 0.88, -h2 * 0.75)
    ctx.strokeStyle = 'rgba(196,132,74,0.5)'
    ctx.lineWidth = Math.max(0.5, s * 0.07)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(44,20,8,0.45)'
    ctx.lineWidth = Math.max(0.4, s * 0.045)
    for (let i = 0; i < 2; i++) {
      const y = (frac(seed, i + 7) - 0.5) * h1 * 1.1
      const x0 = -s * 0.6 + frac(seed, i + 11) * s * 0.5
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x0 + s * (0.4 + frac(seed, i + 13) * 0.4), y + bow * 0.2)
      ctx.stroke()
    }

    // rolled end, seen down the tube
    ctx.beginPath()
    ctx.ellipse(-s * 0.93, 0, s * 0.11, h1, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#5c2f15'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-s * 0.93, 0, s * 0.055, h1 * 0.52, 0, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(168,110,58,0.65)'
    ctx.lineWidth = Math.max(0.4, s * 0.05)
    ctx.stroke()
  },

  ginger: (ctx, s, seed) => {
    ctx.beginPath()
    const pts = 9
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2
      const r = s * (0.6 + frac(seed, i) * 0.42)
      const x = Math.cos(a) * r * 1.15
      const y = Math.sin(a) * r * 0.8
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = '#c09850'
    ctx.fill()
    ctx.strokeStyle = 'rgba(108,76,32,0.6)'
    ctx.lineWidth = Math.max(0.5, s * 0.07)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(-s * 0.2, -s * 0.15, s * 0.28, s * 0.16, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(228,204,158,0.4)'
    ctx.fill()
  },

  cardamom: (ctx, s) => {
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.95)
    ctx.bezierCurveTo(s * 0.62, -s * 0.45, s * 0.62, s * 0.45, 0, s * 0.9)
    ctx.bezierCurveTo(-s * 0.62, s * 0.45, -s * 0.62, -s * 0.45, 0, -s * 0.95)
    ctx.closePath()
    ctx.fillStyle = '#b8bd84'
    ctx.fill()
    ctx.strokeStyle = 'rgba(104,110,64,0.7)'
    ctx.lineWidth = Math.max(0.5, s * 0.06)
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(i * s * 0.28, -s * 0.72)
      ctx.quadraticCurveTo(i * s * 0.36, 0, i * s * 0.24, s * 0.7)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.9)
    ctx.lineTo(0, -s * 1.15)
    ctx.lineWidth = Math.max(0.6, s * 0.09)
    ctx.stroke()
  },

  clove: (ctx, s) => {
    ctx.beginPath()
    ctx.moveTo(-s * 0.1, s * 0.95)
    ctx.lineTo(s * 0.1, s * 0.95)
    ctx.lineTo(s * 0.18, -s * 0.2)
    ctx.lineTo(-s * 0.18, -s * 0.2)
    ctx.closePath()
    ctx.fillStyle = '#5e3520'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(0, -s * 0.42, s * 0.28, s * 0.34, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#7a4526'
    ctx.fill()
    ctx.strokeStyle = '#452313'
    ctx.lineWidth = Math.max(0.5, s * 0.07)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.42)
      ctx.lineTo(Math.cos(a) * s * 0.3, -s * 0.42 + Math.sin(a) * s * 0.36)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(-s * 0.09, -s * 0.52, s * 0.09, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(196,142,96,0.6)'
    ctx.fill()
  },
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: ShapeKind,
  s: number,
  seed: number,
) {
  DRAWERS[kind](ctx, s, seed)
}

/** widest a shape strays from the origin, in units of its size */
const REACH = 1.35

export interface Sprite {
  canvas: HTMLCanvasElement
  /** CSS-pixel side length of the sprite */
  side: number
  /** the `s` the sprite was drawn at */
  size: number
}

export interface SpriteOptions {
  /** a colour blended over the drawn pixels, so no two variants match exactly */
  tint?: string
  tintAmount?: number
  /** blur radius in CSS pixels — used for the pieces sitting deeper in the jar */
  blur?: number
}

/**
 * Filling a dozen paths per piece per frame is what pushes the blender off 60fps,
 * so each shape is rasterised once and the glass blits rotated copies.
 *
 * Tint and blur are baked in here rather than applied per frame: a canvas filter
 * costs about as much as redrawing the paths, and there are only a handful of
 * distinct combinations.
 */
export function makeSprite(
  kind: ShapeKind,
  size: number,
  dpr: number,
  seed: number,
  opts: SpriteOptions = {},
): Sprite {
  const blur = opts.blur ?? 0
  // the blur needs room to fall off, or it is clipped into a hard square edge
  const side = Math.max(4, Math.ceil(size * REACH * 2 + blur * 5))
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(side * dpr)
  canvas.height = Math.ceil(side * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.translate(side / 2, side / 2)
  if (blur > 0) ctx.filter = `blur(${blur}px)`
  DRAWERS[kind](ctx, size, seed)
  ctx.filter = 'none'

  if (opts.tint && opts.tintAmount) {
    // source-atop keeps the tint inside the shape instead of washing the box
    ctx.globalCompositeOperation = 'source-atop'
    ctx.globalAlpha = opts.tintAmount
    ctx.fillStyle = opts.tint
    ctx.fillRect(-side, -side, side * 2, side * 2)
  }
  return { canvas, side, size }
}
