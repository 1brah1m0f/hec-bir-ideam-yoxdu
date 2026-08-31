/**
 * Everything behind the glass, drawn in screen space rather than glass space:
 * the pool of window light, the shafts it throws across the room, the dust that
 * hangs in them, and the vignette that closes the frame.
 *
 * On a large monitor these are full-viewport fills, which is far too much work
 * to repeat every frame — so the light is painted into a half-resolution buffer
 * and blitted up (it is all smooth gradients, the resolution never shows), and
 * the vignette, which never changes, is painted once per resize.
 */

interface Mote {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  phase: number
  twinkle: number
}

interface Shaft {
  /** x of the shaft's centre at the top of the screen, as a fraction of width */
  u: number
  width: number
  tilt: number
  alpha: number
  phase: number
}

const SHAFTS: Shaft[] = [
  { u: 0.12, width: 0.2, tilt: 0.33, alpha: 0.05, phase: 0 },
  { u: 0.3, width: 0.11, tilt: 0.36, alpha: 0.038, phase: 2.1 },
  { u: 0.52, width: 0.26, tilt: 0.3, alpha: 0.026, phase: 4.4 },
]

const LIGHT_SCALE = 0.5

export class Backdrop {
  private motes: Mote[] = []
  private w = 1
  private h = 1
  private count = 46

  private light = document.createElement('canvas')
  private lightCtx!: CanvasRenderingContext2D
  private vignette = document.createElement('canvas')

  /** 0 = still, 1 = fully lit. Rises once the first blend has been poured. */
  warmth = 0

  constructor(lowPower: boolean) {
    this.count = lowPower ? 16 : 46
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.motes = []
    for (let i = 0; i < this.count; i++) this.motes.push(this.makeMote(Math.random() * h))

    this.light.width = Math.max(1, Math.ceil(w * LIGHT_SCALE))
    this.light.height = Math.max(1, Math.ceil(h * LIGHT_SCALE))
    this.lightCtx = this.light.getContext('2d')!

    this.vignette.width = this.light.width
    this.vignette.height = this.light.height
    const v = this.vignette.getContext('2d')!
    v.setTransform(LIGHT_SCALE, 0, 0, LIGHT_SCALE, 0, 0)
    v.clearRect(0, 0, w, h)
    const r = Math.max(w, h)
    const grad = v.createRadialGradient(w * 0.5, h * 0.46, r * 0.24, w * 0.5, h * 0.46, r * 0.82)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.65, 'rgba(6,3,1,0.26)')
    grad.addColorStop(1, 'rgba(4,2,1,0.72)')
    v.fillStyle = grad
    v.fillRect(0, 0, w, h)
  }

  private makeMote(y: number): Mote {
    const r = 0.6 + Math.random() * 1.9
    return {
      x: Math.random() * this.w,
      y,
      r,
      // heavier motes drift slower — the parallax is what sells the depth
      vx: (6 + Math.random() * 14) / r,
      vy: -(4 + Math.random() * 12) / r,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.5 + Math.random() * 0.9,
    }
  }

  step(dt: number, time: number) {
    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(time * 0.4 + m.phase) * 5) * dt
      m.y += m.vy * dt
      if (m.y < -12 || m.x > this.w + 12) {
        Object.assign(m, this.makeMote(this.h + 8 + Math.random() * 40))
        m.x = Math.random() * this.w * 0.9
      }
    }
  }

  /** The room: pool of light and the shafts. Drawn before the glass. */
  drawLight(ctx: CanvasRenderingContext2D, time: number, px: number, py: number) {
    const { w, h } = this
    const lift = 0.35 + this.warmth * 0.65
    const b = this.lightCtx

    b.setTransform(LIGHT_SCALE, 0, 0, LIGHT_SCALE, 0, 0)
    b.clearRect(0, 0, w, h)

    const pool = b.createRadialGradient(
      w * (0.42 + px * 0.04),
      h * (0.4 + py * 0.04),
      0,
      w * 0.42,
      h * 0.4,
      Math.max(w, h) * 0.72,
    )
    pool.addColorStop(0, `rgba(122,74,32,${0.3 * lift})`)
    pool.addColorStop(0.45, `rgba(60,34,15,${0.16 * lift})`)
    pool.addColorStop(1, 'rgba(0,0,0,0)')
    b.fillStyle = pool
    b.fillRect(0, 0, w, h)

    b.globalCompositeOperation = 'lighter'
    for (const s of SHAFTS) {
      const breathe = 0.72 + 0.28 * Math.sin(time * 0.23 + s.phase)
      const cx = w * s.u + px * w * 0.02
      const half = w * s.width * 0.5
      const drop = h * 1.35
      const shift = drop * s.tilt
      b.beginPath()
      b.moveTo(cx - half, -h * 0.1)
      b.lineTo(cx + half, -h * 0.1)
      b.lineTo(cx + half * 2.5 + shift, drop)
      b.lineTo(cx - half * 2.5 + shift, drop)
      b.closePath()
      const grad = b.createLinearGradient(cx, 0, cx + shift, drop)
      grad.addColorStop(0, `rgba(255,214,152,${s.alpha * breathe * lift})`)
      grad.addColorStop(0.5, `rgba(232,176,110,${s.alpha * 0.42 * breathe * lift})`)
      grad.addColorStop(1, 'rgba(180,120,60,0)')
      b.fillStyle = grad
      b.fill()
    }
    b.globalCompositeOperation = 'source-over'

    ctx.drawImage(this.light, 0, 0, this.light.width, this.light.height, 0, 0, w, h)
  }

  /** Dust suspended in the shafts. Drawn after the glass, so motes pass in front. */
  drawMotes(ctx: CanvasRenderingContext2D, time: number) {
    if (!this.motes.length) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255,226,178,1)'
    const lift = 0.35 + this.warmth * 0.65
    for (const m of this.motes) {
      ctx.globalAlpha = (0.1 + 0.16 * (0.5 + 0.5 * Math.sin(time * m.twinkle + m.phase))) * lift
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /** Closes the frame. Drawn last, over everything. */
  drawVignette(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(
      this.vignette,
      0,
      0,
      this.vignette.width,
      this.vignette.height,
      0,
      0,
      this.w,
      this.h,
    )
  }
}
