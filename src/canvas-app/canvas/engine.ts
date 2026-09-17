import { BY_ID } from '../../shared/data/ingredients'
import type { ShapeKind, WeighedItem, WeightClass } from '../../shared/types'
import {
  brewClip,
  BREW_T,
  drawBrew,
  drawBrewCaustics,
  drawBrewKink,
  drawBrewSurface,
  drawCondensation,
  drawPourStream,
  surfaceT,
  WATER,
} from './brew'
import {
  computeGeom,
  drawCausticPool,
  drawGasket,
  drawGlow,
  drawJarBack,
  drawJarFront,
  drawLabel,
  drawLid,
  drawPileShade,
  drawSheen,
  drawTable,
  halfAt,
  innerHalfAtY,
  yAt,
  type Geom,
} from './jar'
import { GradCache, makeBlob, mix, rgba, type Bounds } from './paint'
import { crownAt, drawPileMass, fillLevel, planPile, type Grain } from './pile'
import { Backdrop } from './scene'
import { makeSprite, type Sprite } from './shapes'

const EMPTY_COLOR: [number, number, number] = [232, 214, 178]

/** Largest reference box the jar is ever rasterised at, in CSS pixels. */
const REF_MAX = 820

/** Brew choreography, in seconds. */
const STREAM_FALL = 0.3
const BREW_FILL = 1.5
const STEEP_TIME = 2.8

/** Dry pour, in seconds. */
const FALL_GRAVITY = 4.4
const SETTLE_TAU = 0.14
const LEAVE_TIME = 0.34
const LEVEL_TAU = 0.16
/** Longest gap between two pieces entering the jar. */
const MAX_GAP = 0.07
/** Window a single ingredient's shower is spread over — 0.8–1.2 s by design. */
const SHOWER = 1.05

/**
 * Piece sizes were measured against the tea glass's bore; the jar is wider
 * relative to its height, so everything scales down to keep leaves leaf-sized.
 */
const PIECE_SCALE = 0.46
/**
 * Steeping leaves read better large and few than small and many — the dry heap
 * wants the opposite. One particle set serves both, so the brewed pass scales up.
 */
const BREW_PIECE = 1.32

/** Where each weight class hangs in the tea: heavy low, petals near the surface. */
const BREW_BAND: Record<WeightClass, [number, number]> = {
  heavy: [0.02, 0.46],
  mid: [0.14, 0.8],
  light: [0.4, 1.0],
}
const BREW_DRIFT: Record<WeightClass, number> = { heavy: 0.3, mid: 0.7, light: 1 }

const SHAPE_SCALE: Record<ShapeKind, number> = {
  'tea-black': 0.1,
  'tea-green': 0.095,
  'tea-white': 0.088,
  thyme: 0.115,
  mint: 0.095,
  chamomile: 0.105,
  melissa: 0.1,
  lavender: 0.115,
  'mountain-tea': 0.12,
  apple: 0.15,
  cornel: 0.115,
  rosehip: 0.12,
  'orange-peel': 0.14,
  cinnamon: 0.128,
  ginger: 0.13,
  cardamom: 0.105,
  clove: 0.105,
}

/**
 * Each shape is baked once per variant, and each variant carries a slightly
 * different tint — so a hundred mint leaves in one jar are not a hundred copies
 * of the same picture.
 */
const VARIANTS: { tint?: string; amount?: number }[] = [
  {},
  { tint: '#e8d49a', amount: 0.12 },
  { tint: '#7d6b3f', amount: 0.14 },
  { tint: '#c1834c', amount: 0.11 },
  { tint: '#6d7a4c', amount: 0.11 },
]
/** Crisp for the front rows, softened for whatever sits behind them. */
const BLUR_TIERS = [0, 1.1]

export type Mode = 'dry' | 'brewed'

const enum S {
  Falling,
  Resting,
  Leaving,
}

interface P {
  key: string
  ing: string
  shape: ShapeKind
  cls: WeightClass
  variant: number
  tier: number
  /** 0 crisp and forward, 1 deep — sets alpha and the blur tier */
  depth: number
  u: number
  v: number
  d: number
  jitter: number
  size: number
  rot: number
  spin: number
  x: number
  y: number
  tx: number
  ty: number
  vx: number
  vy: number
  state: S
  delay: number
  age: number
  alpha: number
  shrink: number
}

interface Puff {
  x: number
  y: number
  r: number
  age: number
  life: number
  vy: number
  vx: number
  phase: number
}

/** A speck turning over in the light inside the jar. */
interface Mote {
  x: number
  y: number
  r: number
  vy: number
  phase: number
  speed: number
}

export interface EngineItem {
  ingredientId: string
  grams: number
}

/** Where the jar sits on screen. Everything springs toward the target. */
export interface Anchor {
  cx: number
  cy: number
  scale: number
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function easeOutCubic(k: number) {
  return 1 - (1 - k) ** 3
}

/** Frame-rate independent exponential approach — `tau` is the time constant. */
function approach(cur: number, to: number, tau: number, dt: number) {
  return cur + (to - cur) * (1 - Math.exp(-dt / tau))
}

export class TeaEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private geom: Geom
  private dpr = 1
  private vw = 1
  private vh = 1
  private raf = 0
  private last = 0
  private time = 0

  /** Back to front, so the render loop never has to sort. */
  private particles: P[] = []
  private puffs: Puff[] = []
  private motes: Mote[] = []

  private items: WeighedItem[] = []
  private target: [number, number, number] = EMPTY_COLOR
  private current: [number, number, number] = EMPTY_COLOR
  /** how high the dry blend stands, 0..1 of the body — eased toward its target */
  private level = 0
  private levelTo = 0
  /** how full the jar reads for lighting purposes, 0..1 */
  private fill = 0
  private label = ''
  private labelSize = 100

  private highlight: string | null = null
  private highlightK = 0

  /** band of light crossing the glass after a recipe change, 0..1 */
  private sheen = 0
  /** the room brightens for good once the jar has been filled */
  private warmthTo = 0

  private lid = 0
  private lidTo = 0

  // brewing
  private mode: Mode = 'dry'
  private brew = 0
  private steep = 0
  private lidSet = 0
  private pourAge = 0
  private streamK = 0
  private slosh = 0.05
  private clipLevel = -1
  private clipPath = new Path2D()

  private anchor: Anchor = { cx: 0, cy: 0, scale: 0.8 }
  private shown: Anchor = { cx: 0, cy: 0, scale: 0.8 }
  private placed = false
  private anchorKey = ''
  /**
   * Seconds of soft, springy following left after the jar has been handed to a
   * different anchor. While an anchor merely *moves* — a hero scrolling up the
   * page — the jar tracks it almost rigidly, because a spring there reads as
   * the jar sliding around loose behind the page.
   */
  private handoff = 0
  private pointer = { x: 0, y: 0 }
  private pointerTo = { x: 0, y: 0 }

  private glow!: HTMLCanvasElement
  private shadow!: HTMLCanvasElement
  private wisp!: HTMLCanvasElement
  private dust!: HTMLCanvasElement
  /** table, shadow and the jar's back wall — static, so rasterised per resize */
  private back = document.createElement('canvas')
  private front = document.createElement('canvas')
  private grads = new GradCache()
  private sprites = new Map<string, Sprite>()
  private backdrop: Backdrop

  reducedMotion = false
  private lowPower = false
  private budget = 400
  private maxPuffs = 22

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('canvas 2d unavailable')
    this.ctx = ctx
    this.geom = computeGeom(1, 1)
    this.detectPower()
    this.backdrop = new Backdrop(this.lowPower)
    this.buildSprites()
    this.resize()
  }

  private detectPower() {
    const narrow = window.matchMedia('(max-width: 767px)').matches
    const cores = navigator.hardwareConcurrency ?? 8
    this.lowPower = narrow || cores <= 4
    this.budget = this.lowPower ? 200 : 400
    this.maxPuffs = this.lowPower ? 10 : 22
  }

  private buildSprites() {
    this.glow = makeBlob(256, 'rgba(226,168,96,0.9)', 'rgba(180,110,50,0.28)')
    this.shadow = makeBlob(256, 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.35)')
    this.wisp = makeBlob(128, 'rgba(255,244,224,0.8)', 'rgba(238,206,160,0.26)')
    // dry dust, not vapour: browner, and it never gets bright
    this.dust = makeBlob(96, 'rgba(196,158,108,0.55)', 'rgba(150,116,74,0.22)')
  }

  resize() {
    const vw = Math.max(1, window.innerWidth)
    const vh = Math.max(1, window.innerHeight)
    this.vw = vw
    this.vh = vh
    // a 4K desktop window at dpr 2 is a 30-megapixel canvas to clear and refill
    // every frame; past roughly a 2K window the extra density buys nothing
    const wide = vw * vh > 2_000_000
    this.dpr = Math.min(window.devicePixelRatio || 1, this.lowPower || wide ? 1.5 : 2)
    this.canvas.width = Math.round(vw * this.dpr)
    this.canvas.height = Math.round(vh * this.dpr)
    this.canvas.style.width = `${vw}px`
    this.canvas.style.height = `${vh}px`

    const refH = Math.min(vh * 0.94, vw * 1.45, REF_MAX)
    const refW = refH * 0.8
    const prev = this.geom
    this.geom = computeGeom(refW, refH)
    this.grads.clear()
    this.sprites.clear()
    this.clipLevel = -1
    this.buildLayers()
    this.buildMotes()
    this.backdrop.resize(vw, vh)

    // sizes are relative to the jar, so they have to be recomputed, and the
    // pieces snapped to their new places rather than springing across a resize
    const k = prev.w > 1 ? this.geom.maxHalf / prev.maxHalf : 1
    for (const p of this.particles) {
      p.size *= k
      this.aim(p)
      if (p.state !== S.Falling) {
        p.x = p.tx
        p.y = p.ty
      }
    }
    this.puffs.length = 0
  }

  private buildLayers() {
    const g = this.geom
    const paint = (
      canvas: HTMLCanvasElement,
      b: Bounds,
      draw: (c: CanvasRenderingContext2D) => void,
    ) => {
      canvas.width = Math.max(1, Math.round(b.w * this.dpr))
      canvas.height = Math.max(1, Math.round(b.h * this.dpr))
      const c = canvas.getContext('2d')!
      c.setTransform(this.dpr, 0, 0, this.dpr, -b.x * this.dpr, -b.y * this.dpr)
      c.clearRect(b.x, b.y, b.w, b.h)
      draw(c)
    }

    paint(this.back, g.backBounds, (c) => {
      drawTable(c, g, this.shadow)
      drawJarBack(c, g)
    })
    paint(this.front, g.frontBounds, (c) => drawJarFront(c, g))
  }

  private buildMotes() {
    const g = this.geom
    this.motes = []
    const n = this.lowPower ? 6 : 14
    for (let i = 0; i < n; i++) {
      this.motes.push({
        x: g.cx + (Math.random() - 0.5) * g.maxHalf * 1.5,
        y: g.bottom - g.bodyH * (0.2 + Math.random() * 0.7),
        r: g.maxHalf * (0.004 + Math.random() * 0.008),
        vy: -g.bodyH * (0.008 + Math.random() * 0.02),
        phase: Math.random() * 7,
        speed: 0.3 + Math.random() * 0.7,
      })
    }
  }

  // ------------------------------------------------------------------ controls

  /**
   * Point the jar at a box on screen. The box is a plain viewport rect — the
   * jar is fitted inside it and springs there from wherever it was.
   */
  setAnchorRect(
    rect: { left: number; top: number; width: number; height: number },
    fit = 1,
    key = 'default',
  ) {
    const g = this.geom
    const scale = Math.min(rect.width / g.w, rect.height / g.h) * fit
    this.retarget(key, {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      scale: Math.max(0.08, scale),
    })
  }

  /** No anchor on this page — the jar leaves down past the bottom edge. */
  park() {
    this.retarget('park', { cx: this.vw * 0.5, cy: this.vh * 1.72, scale: 0.55 })
  }

  private retarget(key: string, to: Anchor) {
    if (key !== this.anchorKey) {
      this.anchorKey = key
      if (this.placed) this.handoff = 0.7
    }
    this.anchor = to
    if (!this.placed) {
      this.shown = { ...to }
      this.placed = true
    }
  }

  /** Normalised pointer position, -1..1 on both axes. */
  setPointer(nx: number, ny: number) {
    this.pointerTo.x = Math.max(-1, Math.min(1, nx))
    this.pointerTo.y = Math.max(-1, Math.min(1, ny))
  }

  /** The name and package size printed on the jar's label. */
  setLabel(name: string, size: number) {
    this.label = name
    this.labelSize = size
  }

  /** Lights one ingredient's pieces and dims the rest. Null clears it. */
  setHighlight(id: string | null) {
    this.highlight = id
  }

  /** Dry blend in a closed jar, or the same blend brewed with the lid off. */
  setMode(mode: Mode) {
    if (mode === this.mode) return
    this.mode = mode
    if (this.reducedMotion) {
      const on = mode === 'brewed'
      this.brew = on ? 1 : 0
      this.steep = on ? 1 : 0
      this.lidSet = on ? 1 : 0
      for (const p of this.particles) this.snap(p)
      return
    }
    if (mode === 'brewed') {
      this.pourAge = 0
      this.steep = 0
      this.lidTo = 0
    } else {
      this.slosh = 0.05
    }
  }

  setBlend(items: WeighedItem[], color: [number, number, number]) {
    const had = this.items.length
    const changed =
      Math.abs(color[0] - this.target[0]) +
        Math.abs(color[1] - this.target[1]) +
        Math.abs(color[2] - this.target[2]) >
      14
    this.items = items
    this.target = items.length ? color : EMPTY_COLOR
    if (!had && items.length) this.current = [...color] as typeof color
    if (items.length) this.warmthTo = 1
    if (items.length && had && changed && !this.reducedMotion) {
      this.sheen = 1
      if (this.brew > 0.1) this.slosh = Math.min(0.5, this.slosh + 0.25)
    }
    this.levelTo = fillLevel(items)
    this.reconcile()
  }

  /** Tip the whole blend out and pour it back in. */
  pour() {
    if (this.reducedMotion) {
      for (const p of this.particles) this.snap(p)
      return
    }
    if (this.mode === 'brewed') {
      // while brewing, "again" means stirring the leaves up, not refilling
      this.slosh = 0.8
      for (const p of this.particles) {
        if (p.state === S.Leaving) continue
        p.vx = (Math.random() - 0.5) * this.geom.maxHalf * 2.4
        p.vy = (Math.random() - 0.5) * this.geom.maxHalf * 1.4
      }
      return
    }
    const alive = this.particles.filter((p) => p.state !== S.Leaving)
    this.lidTo = 1
    this.puffs.length = 0
    alive.forEach((p, i) => this.launch(p, i, alive.length))
  }

  // ------------------------------------------------------------------- the pile

  /**
   * Brings the pile in line with the recipe. Pieces that stay keep their exact
   * place — the plan is a pure function of each piece's own identity, never of
   * what else is in the jar — so a change only ever reads as pieces arriving or
   * pieces disappearing.
   */
  private reconcile() {
    const plan = this.items.length ? planPile(this.items, this.budget, VARIANTS.length) : []
    const have = new Map<string, P>()
    for (const p of this.particles) if (p.state !== S.Leaving) have.set(p.key, p)

    const next: P[] = []
    const fresh: P[] = []
    for (const g of plan) {
      const kept = have.get(g.key)
      if (kept) {
        have.delete(g.key)
        next.push(kept)
      } else {
        const born = this.make(g)
        next.push(born)
        fresh.push(born)
      }
    }

    // whatever the recipe no longer asks for fades out exactly where it stands
    for (const gone of have.values()) {
      gone.state = S.Leaving
      gone.age = 0
      gone.vx = 0
      gone.vy = 0
    }
    const leaving = this.particles.filter((p) => p.state === S.Leaving)

    for (const p of next) this.aim(p)
    if (this.reducedMotion) {
      for (const p of fresh) this.snap(p)
    } else if (fresh.length) {
      // nothing can be poured in through a closed lid
      if (this.mode === 'dry') this.lidTo = 1
      fresh.forEach((p, i) => this.launch(p, i, fresh.length))
    }

    // plan order is back-to-front; the fading pieces ride on top, briefly
    this.particles = [...next, ...leaving]
  }

  private make(g: Grain): P {
    const meta = BY_ID[g.ing]
    const shape = meta?.shape ?? 'tea-black'
    const cls = meta?.weightClass ?? 'mid'
    const size = this.geom.maxHalf * SHAPE_SCALE[shape] * PIECE_SCALE * g.scale
    return {
      key: g.key,
      ing: g.ing,
      shape,
      cls,
      variant: g.variant,
      tier: g.depth > 0.5 ? 1 : 0,
      depth: g.depth,
      u: g.u,
      v: g.v,
      d: g.d,
      jitter: g.jitter,
      size,
      rot: g.rot,
      spin: (g.u - g.d) * 3,
      x: this.geom.cx,
      y: this.geom.bottom,
      tx: this.geom.cx,
      ty: this.geom.bottom,
      vx: 0,
      vy: 0,
      state: S.Resting,
      delay: 0,
      age: 0,
      alpha: 1,
      shrink: 1,
    }
  }

  /** Where this piece belongs, given the current level and mode. */
  private aim(p: P) {
    const g = this.geom

    if (this.brew > 0.1) {
      const band = BREW_BAND[p.cls]
      const t = surfaceT(this.brew) * (band[0] + (band[1] - band[0]) * p.v)
      const y = yAt(g, t)
      p.tx = g.cx + p.u * Math.max(1, innerHalfAtY(g, y, p.size * 0.6)) * 0.85
      p.ty = y
      return
    }

    const H = this.level * g.bodyH
    // the same crown the dark mass behind the pieces is drawn to, plus a scatter
    // per piece so the surface is grains rather than a curve
    const rise = (0.035 + 0.965 * p.v ** 0.92) * crownAt(p.u) + p.jitter * p.v
    const y = g.bottom - H * rise
    const room = Math.max(1, innerHalfAtY(g, y, p.size * 0.55))
    p.tx = g.cx + p.u * room * (1 - 0.22 * p.v ** 2)
    p.ty = y
  }

  /** Sends a piece back in through the mouth of the jar. */
  private launch(p: P, index: number, total: number) {
    const g = this.geom
    // one ingredient's worth of pieces lands inside the 0.8–1.2 s the design
    // asks for; a whole preset arriving at once is deliberately longer
    const gap = Math.max(0.0035, Math.min(MAX_GAP, SHOWER / Math.max(1, total)))
    p.state = S.Falling
    p.delay = index * gap
    p.age = 0
    p.alpha = 1
    p.shrink = 1
    p.y = g.top - g.bodyH * (0.1 + ((index * 7919) % 100) / 100 * 0.14)
    p.x = g.cx + p.u * g.neckHalf * 0.55
    p.vx = p.u * g.maxHalf * 0.5
    p.vy = 0
  }

  private snap(p: P) {
    this.aim(p)
    p.x = p.tx
    p.y = p.ty
    p.state = S.Resting
    p.delay = 0
    p.alpha = 1
    p.shrink = 1
    p.vx = 0
    p.vy = 0
  }

  start() {
    if (this.raf) return
    this.last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      // freezing the clock is what actually stops the idle motion — the sheen,
      // the wisps and the breathing light shafts are all functions of time.
      // dt keeps flowing, so colour and placement still ease between states.
      if (!this.reducedMotion) this.time += dt
      this.step(dt)
      this.render()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  // ---------------------------------------------------------------- simulation

  private step(dt: number) {
    this.handoff = Math.max(0, this.handoff - dt)
    // handing over to a new anchor eases; following one that is simply moving
    // with the page is near-rigid, or the jar appears to float free of it
    const tau = this.handoff > 0 ? 0.26 : 0.045
    this.shown.cx = approach(this.shown.cx, this.anchor.cx, tau, dt)
    this.shown.cy = approach(this.shown.cy, this.anchor.cy, tau, dt)
    this.shown.scale = approach(this.shown.scale, this.anchor.scale, tau * 1.2, dt)
    this.pointer.x = approach(this.pointer.x, this.pointerTo.x, 0.45, dt)
    this.pointer.y = approach(this.pointer.y, this.pointerTo.y, 0.45, dt)

    const k = 1 - Math.exp(-dt / 0.2)
    for (let i = 0; i < 3; i++) {
      this.current[i] = Math.round(this.current[i] + (this.target[i] - this.current[i]) * k)
    }

    this.backdrop.warmth = approach(this.backdrop.warmth, this.warmthTo, 0.9, dt)
    this.sheen = Math.max(0, this.sheen - dt / 1.15)
    this.highlightK = approach(this.highlightK, this.highlight ? 1 : 0, 0.14, dt)

    // the level is the one number the whole heap hangs off; easing it is what
    // makes adding read as a rise and removing as a settle
    this.level = approach(this.level, this.levelTo, LEVEL_TAU, dt)
    if (Math.abs(this.level - this.levelTo) < 0.0005) this.level = this.levelTo

    this.stepMode(dt)
    this.stepParticles(dt)
    this.stepPuffs(dt)
    this.stepMotes(dt)
    if (!this.reducedMotion) this.backdrop.step(dt, this.time)

    this.fill = approach(this.fill, Math.max(this.level, this.brew), 0.18, dt)
  }

  private stepMode(dt: number) {
    // idle chop never fully dies — a real surface is never a mirror
    const idle = 0.05
    this.slosh = idle + Math.max(0, this.slosh - idle) * Math.exp(-dt / 0.95)

    if (this.mode === 'brewed') {
      this.lid = approach(this.lid, 0, 0.15, dt)
      this.lidSet = approach(this.lidSet, 1, 0.3, dt)
      // the water only goes in once the lid is clear of the neck
      if (this.lidSet > 0.5) {
        this.pourAge += dt
        const fillK = clamp01((this.pourAge - STREAM_FALL) / BREW_FILL)
        this.brew = easeOutCubic(fillK)
        this.streamK =
          fillK >= 1 ? Math.max(0, this.streamK - dt / 0.3) : Math.min(1, this.streamK + dt / 0.12)
        if (fillK > 0.05) this.steep = Math.min(1, this.steep + dt / STEEP_TIME)
        if (fillK < 1) this.slosh = Math.max(this.slosh, 0.3)
      }
      return
    }

    // back to dry: drain first, then bring the lid home
    this.streamK = Math.max(0, this.streamK - dt / 0.25)
    this.brew = approach(this.brew, 0, 0.26, dt)
    if (this.brew < 0.04) this.brew = 0
    this.steep = approach(this.steep, 0, 0.4, dt)
    if (this.brew < 0.4) this.lidSet = approach(this.lidSet, 0, 0.26, dt)
    this.lid = approach(this.lid, this.lidTo, this.lidTo > this.lid ? 0.17 : 0.13, dt)
    // the lid closes once the last piece is down
    if (this.lidTo > 0 && !this.particles.some((p) => p.state === S.Falling)) this.lidTo = 0
  }

  private stepParticles(dt: number) {
    const g = this.geom
    const brewed = this.brew > 0.1
    const a = this.time * 0.16
    const alive: P[] = []

    for (const p of this.particles) {
      if (p.state === S.Leaving) {
        // in place: no drift, no lift, nothing leaves the jar. It shrinks a
        // little and goes, and the mass above it comes down to fill the gap.
        p.age += dt
        const kk = clamp01(p.age / LEAVE_TIME)
        p.alpha = (1 - kk) ** 1.5
        p.shrink = 1 - 0.45 * kk
        if (kk < 1) alive.push(p)
        continue
      }

      this.aim(p)

      if (p.state === S.Falling) {
        if (p.delay > 0) {
          p.delay -= dt
          alive.push(p)
          continue
        }
        p.vy += FALL_GRAVITY * g.bodyH * dt
        p.y += p.vy * dt
        p.x += p.vx * dt
        p.vx *= Math.exp(-1.8 * dt)
        p.rot += p.spin * dt

        // a piece that touches the glass on the way down bounces off it
        const room = Math.max(1, innerHalfAtY(g, p.y, p.size * 0.55))
        if (Math.abs(p.x - g.cx) > room) {
          p.x = g.cx + Math.sign(p.x - g.cx) * room
          p.vx *= -0.45
        }
        // and is nudged towards its resting column as it nears the heap
        p.x = lerp(p.x, p.tx, Math.min(1, dt * 2.4))

        if (p.y >= p.ty) {
          p.state = S.Resting
          p.y = p.ty
          p.vy = 0
          if (!brewed && this.puffs.length < this.maxPuffs && Math.random() < 0.22) {
            this.puffs.push(this.makeDust(p.x, p.y, p.size))
          }
        }
        alive.push(p)
        continue
      }

      if (brewed) {
        // suspended in the tea: a slow convection cell turns the leaves over
        const u = (p.x - g.cx) / g.maxHalf
        const v = (g.bottom - p.y) / g.bodyH
        const fx = Math.cos(u * 2 + a) * Math.sin(v * 2.7 - a * 0.7)
        const fy = -Math.sin(u * 2 + a) * Math.cos(v * 2.7 - a * 0.7)
        const drift = g.maxHalf * (0.14 + this.slosh * 0.5) * BREW_DRIFT[p.cls]
        p.vx *= Math.exp(-3 * dt)
        p.vy *= Math.exp(-3 * dt)
        p.x = approach(p.x, p.tx + fx * drift, 0.55, dt) + p.vx * dt
        p.y = approach(p.y, p.ty + fy * drift * 0.55, 0.55, dt) + p.vy * dt
        p.rot += dt * 0.4 * Math.sin(this.time * 0.7 + p.v * 9) * (p.cls === 'light' ? 1.6 : 0.6)
        const room = Math.max(1, innerHalfAtY(g, p.y, p.size * 0.6))
        p.x = Math.max(g.cx - room, Math.min(g.cx + room, p.x))
        alive.push(p)
        continue
      }

      // settled: ease onto the target so a level change sinks or lifts the mass
      p.x = approach(p.x, p.tx, SETTLE_TAU, dt)
      p.y = approach(p.y, p.ty, SETTLE_TAU, dt)
      alive.push(p)
    }

    this.particles = alive
  }

  private stepPuffs(dt: number) {
    // only hot tea steams. A dry jar gets nothing but the dust a landing piece
    // knocks up, which is spawned where it lands — vapour rising out of a sealed
    // jar of dry leaves was the single thing that made it look wet.
    const hot = this.brew > 0.15
    if (hot && !this.reducedMotion && this.puffs.length < this.maxPuffs) {
      if (Math.random() < dt * 16) this.puffs.push(this.makeSteam())
    }
    this.puffs = this.puffs.filter((s) => {
      s.age += dt
      s.y += s.vy * dt
      s.x += (s.vx + Math.sin(this.time * 1.1 + s.phase) * this.geom.maxHalf * 0.25) * dt
      s.r += Math.abs(s.vy) * 0.3 * dt
      return s.age < s.life
    })
  }

  private stepMotes(dt: number) {
    if (this.reducedMotion) return
    const g = this.geom
    const floor = this.brew > 0.1 ? yAt(g, surfaceT(this.brew)) : g.bottom - this.level * g.bodyH
    for (const m of this.motes) {
      m.y += m.vy * dt
      m.x += Math.sin(this.time * m.speed + m.phase) * g.maxHalf * 0.06 * dt
      if (m.y < g.top + g.bodyH * 0.05) {
        m.y = floor - g.bodyH * 0.02
        m.x = g.cx + (Math.random() - 0.5) * g.maxHalf * 1.4
      }
    }
  }

  private makeDust(x: number, y: number, size: number): Puff {
    return {
      x,
      y,
      r: size * (1.1 + Math.random() * 0.7),
      age: 0,
      life: 0.4 + Math.random() * 0.3,
      vy: -this.geom.bodyH * (0.015 + Math.random() * 0.03),
      vx: (Math.random() - 0.5) * this.geom.maxHalf * 0.5,
      phase: Math.random() * 7,
    }
  }

  private makeSteam(): Puff {
    const g = this.geom
    const t = surfaceT(this.brew)
    return {
      x: g.cx + (Math.random() - 0.5) * halfAt(g, t) * 1.3,
      y: yAt(g, t) - g.maxHalf * 0.08,
      r: g.maxHalf * (0.12 + Math.random() * 0.18),
      age: 0,
      life: 2.4 + Math.random() * 1.6,
      vy: -g.bodyH * (0.2 + Math.random() * 0.16),
      vx: (Math.random() - 0.5) * g.maxHalf * 0.4,
      phase: Math.random() * 7,
    }
  }

  /** The tea's colour: pale water at first, deepening as the leaves give up. */
  private liquidColor(): [number, number, number] {
    return mix(WATER, this.current, this.steep)
  }

  private liquidClip(): Path2D {
    const key = Math.round(this.brew * 200)
    if (key !== this.clipLevel) {
      this.clipLevel = key
      this.clipPath = brewClip(this.geom, this.brew)
    }
    return this.clipPath
  }

  // ------------------------------------------------------------------ rendering

  private render() {
    const { ctx } = this
    const d = this.dpr
    ctx.setTransform(d, 0, 0, d, 0, 0)
    ctx.clearRect(0, 0, this.vw, this.vh)

    this.backdrop.drawLight(ctx, this.time, this.pointer.x, this.pointer.y)

    // the jar and everything in it lives in reference-box coordinates; one
    // transform maps that box onto wherever the page currently wants it
    const g = this.geom
    const breathe = this.reducedMotion ? 0 : Math.sin(this.time * 0.34) * 0.005
    const s = this.shown.scale * (1 + breathe)
    const px = this.shown.cx + this.pointer.x * 14 * this.shown.scale
    const py = this.shown.cy + this.pointer.y * 9 * this.shown.scale - breathe * g.h * 0.6
    ctx.setTransform(d * s, 0, 0, d * s, d * (px - g.anchorX * s), d * (py - g.anchorY * s))

    // on the cart and checkout pages the jar has left the screen entirely;
    // skipping it there takes the whole scene's drawing cost off the frame
    if (this.jarOnScreen(px, py, s)) this.renderJar()

    ctx.setTransform(d, 0, 0, d, 0, 0)
    this.backdrop.drawMotes(ctx, this.time)
    this.backdrop.drawVignette(ctx)
  }

  /** Does anything the jar draws still land inside the viewport? */
  private jarOnScreen(px: number, py: number, s: number) {
    const g = this.geom
    const halfW = g.maxHalf * 3 * s
    const topY = py + (g.top - g.bodyH - g.anchorY) * s
    const botY = py + (g.bottom + g.maxHalf * 1.2 - g.anchorY) * s
    return px + halfW > 0 && px - halfW < this.vw && botY > 0 && topY < this.vh
  }

  private renderJar() {
    const { ctx, geom: g } = this
    const liquid = this.liquidColor()
    const brewed = this.brew > 0.1
    const tint = brewed ? liquid : this.current
    this.grads.frame(tint, brewed ? this.brew : this.fill)

    drawGlow(ctx, g, this.fill, this.glow)
    this.blit(this.back, g.backBounds)
    drawCausticPool(ctx, g, tint, this.fill, this.glow, this.time)

    if (brewed) this.renderBrewed(liquid)
    else this.renderDry()

    this.renderMotes()
    this.blit(this.front, g.frontBounds)
    drawLabel(ctx, g, this.label, this.labelSize, tint)
    drawSheen(ctx, g, this.sheen)
    this.renderPuffs()
    drawLid(ctx, g, this.lid, this.lidSet)
    drawPourStream(ctx, g, liquid, this.streamK, this.streamHead(), this.time)
  }

  private streamHead(): number {
    const g = this.geom
    const startY = g.top - g.bodyH * 0.85
    const end = yAt(g, BREW_T)
    const k = clamp01(this.pourAge / STREAM_FALL)
    return startY + (end - startY) * (k * k)
  }

  // ------------------------------------------------------------------- dry mode

  private renderDry() {
    const { ctx, geom: g } = this

    this.renderReflection()

    drawPileMass(ctx, g, this.current, this.level)

    // the heap, clipped to the inside of the glass so nothing spills through
    ctx.save()
    ctx.clip(g.inner)
    for (const p of this.particles) {
      if (p.state === S.Falling && p.y < p.ty - p.size * 1.5) continue
      this.blitParticle(p, this.grainAlpha(p))
    }
    ctx.restore()

    drawPileShade(ctx, g, this.current, this.fill, this.level)
    this.renderPileLight()
    drawGasket(ctx, g)

    // pieces still on their way down, above the heap and through the neck
    for (const p of this.particles) {
      if (p.state === S.Falling && p.delay <= 0 && p.y < p.ty - p.size * 1.5) {
        this.blitParticle(p, this.grainAlpha(p))
      }
    }
  }

  /**
   * Depth and highlight in one number. Pieces further back or pressed against
   * the curve of the side glass sit in less light, which on a dark interior is
   * simply less alpha; a highlighted ingredient keeps its own and takes the
   * light away from everything else.
   */
  private grainAlpha(p: P, depth = true) {
    let a = p.alpha * (depth ? 1 - p.depth * 0.42 : 1)
    if (this.highlightK > 0.01) {
      const mine = p.ing === this.highlight
      a *= mine ? 1 : 1 - 0.78 * this.highlightK
      if (mine) a = Math.min(1, a + 0.25 * this.highlightK)
    }
    return a
  }

  /**
   * The heap mirrored in the table top. Per-piece alpha does the fading a
   * gradient mask would normally do — with discrete objects it reads the same
   * and costs nothing but the blits.
   */
  private renderReflection() {
    if (this.level < 0.04) return
    const { ctx, geom: g } = this
    const H = Math.max(1, this.level * g.bodyH)
    ctx.save()
    ctx.translate(0, g.bottom * 1.42)
    ctx.scale(1, -0.42)
    for (const p of this.particles) {
      if (p.state !== S.Resting) continue
      const up = (g.bottom - p.y) / H
      if (up > 0.55) continue
      this.blitParticle(p, 0.12 * (1 - up / 0.55) ** 1.6 * p.alpha)
    }
    ctx.restore()
  }

  /** A patch of the window light landing on the heap. */
  private renderPileLight() {
    if (this.level < 0.04) return
    const { ctx, geom: g } = this
    const H = this.level * g.bodyH
    const cx = g.cx - g.maxHalf * 0.35
    const cy = g.bottom - H * 0.75
    const r = g.maxHalf * 1.15
    ctx.save()
    ctx.clip(g.inner)
    ctx.globalCompositeOperation = 'lighter'
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, `rgba(255,228,178,${0.15 * this.fill})`)
    grad.addColorStop(0.6, `rgba(238,190,132,${0.05 * this.fill})`)
    grad.addColorStop(1, 'rgba(200,150,90,0)')
    ctx.fillStyle = grad
    ctx.fillRect(g.cx - g.maxHalf * 1.2, cy - r, g.maxHalf * 2.4, r * 2)
    ctx.restore()
  }

  // ---------------------------------------------------------------- brewed mode

  private renderBrewed(liquid: [number, number, number]) {
    const { ctx, geom: g } = this
    const surfaceY = yAt(g, surfaceT(this.brew))

    ctx.save()
    ctx.clip(this.liquidClip())
    drawBrew(ctx, g, liquid, this.brew, this.grads)

    for (const p of this.particles) {
      const depth = clamp01((p.y - surfaceY) / Math.max(1, g.bottom - surfaceY))
      this.blitParticle(p, this.grainAlpha(p, false) * (0.9 - depth * 0.4), BREW_PIECE)
    }

    this.renderMurk(liquid, surfaceY)
    drawBrewCaustics(ctx, g, liquid, this.brew, this.time)
    ctx.restore()

    drawBrewSurface(ctx, g, liquid, this.brew, this.time, this.slosh, this.grads)

    // anything still above the water line, dropping in
    for (const p of this.particles) {
      if (p.y < surfaceY - p.size * 0.5) this.blitParticle(p, this.grainAlpha(p, false), BREW_PIECE)
    }

    drawBrewKink(ctx, g, liquid, this.brew)
    drawCondensation(ctx, g, this.brew, this.time)
  }

  private renderMurk(color: [number, number, number], surfaceY: number) {
    const { ctx, geom: g } = this
    const grad = ctx.createLinearGradient(0, surfaceY, 0, g.bottom)
    grad.addColorStop(0, rgba(color, 0))
    grad.addColorStop(0.55, rgba(mix(color, [0, 0, 0], 0.25), 0.34))
    grad.addColorStop(1, rgba(mix(color, [0, 0, 0], 0.5), 0.6))
    ctx.fillStyle = grad
    ctx.fillRect(g.cx - g.maxHalf * 1.2, surfaceY, g.maxHalf * 2.4, g.bottom - surfaceY + 4)
  }

  // ---------------------------------------------------------------------- bits

  private blit(layer: HTMLCanvasElement, b: Bounds) {
    if (b.w <= 0 || b.h <= 0) return
    this.ctx.drawImage(layer, 0, 0, layer.width, layer.height, b.x, b.y, b.w, b.h)
  }

  private spriteFor(p: P): Sprite {
    const key = `${p.shape}:${p.variant}:${p.tier}`
    let sprite = this.sprites.get(key)
    if (!sprite) {
      // baked at the largest size any piece of this shape reaches, so scaling
      // down never shows the raster
      const size = this.geom.maxHalf * SHAPE_SCALE[p.shape] * PIECE_SCALE * 1.2
      const v = VARIANTS[p.variant] ?? {}
      sprite = makeSprite(p.shape, size, this.dpr, p.variant * 37.3 + 5.1, {
        tint: v.tint,
        tintAmount: v.amount,
        blur: BLUR_TIERS[p.tier],
      })
      this.sprites.set(key, sprite)
    }
    return sprite
  }

  private blitParticle(p: P, alpha: number, boost = 1) {
    if (alpha <= 0.004) return
    const { ctx } = this
    const sprite = this.spriteFor(p)
    const side = sprite.side * (p.size / sprite.size) * p.shrink * boost
    ctx.save()
    ctx.globalAlpha = clamp01(alpha)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.drawImage(sprite.canvas, -side / 2, -side / 2, side, side)
    // a highlighted ingredient gets a soft bloom so it can be picked out
    if (this.highlightK > 0.01 && p.ing === this.highlight) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.34 * this.highlightK
      const big = side * 1.22
      ctx.drawImage(sprite.canvas, -big / 2, -big / 2, big, big)
    }
    ctx.restore()
  }

  private renderMotes() {
    if (this.reducedMotion || this.fill < 0.05) return
    const { ctx } = this
    ctx.save()
    ctx.clip(this.geom.outer)
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255,236,200,1)'
    for (const m of this.motes) {
      ctx.globalAlpha = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(this.time * m.speed * 2 + m.phase))
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private renderPuffs() {
    if (!this.puffs.length || this.reducedMotion) return
    const { ctx } = this
    const hot = this.brew > 0.15
    const sprite = hot ? this.wisp : this.dust
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const s of this.puffs) {
      const k = s.age / s.life
      const a = (hot ? 0.2 : 0.09) * Math.min(1, k / 0.15) * (1 - k) ** 1.4
      if (a <= 0.005) continue
      ctx.globalAlpha = a
      const wob = 1 + Math.sin(this.time * 1.3 + s.phase) * 0.14
      ctx.drawImage(sprite, s.x - s.r * wob, s.y - s.r, s.r * 2 * wob, s.r * 2)
    }
    ctx.restore()
  }
}
