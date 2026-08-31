import { BY_ID, REFERENCE_BULK, TOTAL_GRAMS } from '../../shared/data/ingredients'
import type { WeighedItem } from '../../shared/types'
import { innerHalfAtY, type Geom } from './jar'
import { BLACK, mix, rgba, WHITE } from './paint'

/**
 * Where every piece of the dry blend sits, and how high the blend stands.
 *
 * Two properties drive the whole design:
 *
 *   Deterministic — a piece's place comes from a hash of its ingredient and its
 *   index, nothing else. The same blend looks identical on every reload.
 *
 *   Composition-independent — because that hash ignores the rest of the recipe,
 *   adding or removing an ingredient never moves the pieces that stay. They only
 *   rise or sink with the level, which is what makes a change read as "more" or
 *   "less" instead of a reshuffle.
 */

/** Height 100 g of a reference-density blend reaches, as a fraction of the jar. */
const FULL_FILL = 0.82
const MIN_FILL = 0.08
const MAX_FILL = 0.94

/**
 * How full the jar looks for a blend of one thing, and how fast that closes on
 * a full jar as more is added. Strictly the package is always 100 g, so a jar
 * holding one ingredient holds exactly as much as a jar holding six — but a
 * blender that is already full before you have chosen anything gives no sense of
 * building something, so the level is deliberately scaled by variety too.
 */
const ONE_INGREDIENT = 0.42
const VARIETY_DECAY = 0.55

function variety(n: number): number {
  return n <= 0 ? 0 : 1 - (1 - ONE_INGREDIENT) * VARIETY_DECAY ** (n - 1)
}

/** Fewest pieces of an ingredient that must be visible, however little there is. */
export const MIN_GRAINS = 8
/** How many of those are pinned against the front glass so they cannot hide. */
const FRONT_GRAINS = 3

/** Loose volume of the blend in millilitres. */
export function blendVolume(items: WeighedItem[]): number {
  let ml = 0
  for (const it of items) {
    const ing = BY_ID[it.ingredientId]
    if (ing) ml += it.grams * ing.bulk
  }
  return ml
}

/**
 * How full the jar looks, 0..1. Always 100 g by weight, but 100 g of whole mint
 * leaves is nearly twice the volume of 100 g of cloves — so the level moves with
 * what the blend is made of, not just with how much of it there is.
 *
 * The square root compresses the range: without it a leafy blend pins against
 * the cap and every dense one looks half empty.
 */
export function fillLevel(items: WeighedItem[]): number {
  if (items.length === 0) return 0
  const k = blendVolume(items) / (TOTAL_GRAMS * REFERENCE_BULK)
  const h = FULL_FILL * Math.sqrt(k) * variety(items.length)
  return Math.min(MAX_FILL, Math.max(MIN_FILL, h))
}

// ------------------------------------------------------------------ randomness

function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Small, fast, and identical on every machine — Math.random would not be. */
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * R3 low-discrepancy sequence. Consecutive points land far apart, so one
 * ingredient's pieces spread evenly through the jar instead of clumping the way
 * plain random values do — and different ingredients, starting at different
 * offsets, interleave rather than forming layers.
 */
const G = 1.220744084605759
const A1 = 1 / G
const A2 = 1 / (G * G)
const A3 = 1 / (G * G * G)
const frac = (n: number) => n - Math.floor(n)

function r3(i: number): [number, number, number] {
  return [frac(0.5 + A1 * i), frac(0.5 + A2 * i), frac(0.5 + A3 * i)]
}

// ---------------------------------------------------------------------- grains

export interface Grain {
  /** stable identity: the same string always means the same piece */
  key: string
  ing: string
  /** -1..1 across the jar */
  u: number
  /** 0 at the base to 1 at the crown of the heap */
  v: number
  /** -1 at the back wall to 1 pressed against the front glass */
  d: number
  /** size multiplier, ±20% */
  scale: number
  rot: number
  variant: number
  /** small vertical scatter so the crown is not a drawn curve */
  jitter: number
  /**
   * 0 crisp and near the front, 1 deep or hard against the side glass. Drives
   * alpha, which blur tier is used, and the order pieces are drawn in.
   */
  depth: number
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

function makeGrain(ing: string, index: number, offset: number, variants: number): Grain {
  const rnd = mulberry32(hash32(`${ing}#${index}`))
  const [s1, s2, s3] = r3(offset + index)

  // a square of samples would pile pieces into corners the jar does not have;
  // sqrt on the radius spreads them evenly over a circular cross-section
  const r = Math.sqrt(s1)
  const a = s2 * Math.PI * 2
  let u = r * Math.cos(a)
  let d = r * Math.sin(a)
  let v = s3

  const front = index < FRONT_GRAINS
  if (front) {
    // pinned to the front glass, and spread up the height so a trace ingredient
    // is findable rather than buried at the bottom
    d = 0.62 + rnd() * 0.3
    u = (rnd() * 2 - 1) * 0.72
    v = 0.16 + ((index + rnd() * 0.7) / FRONT_GRAINS) * 0.7
  }

  const back = (1 - d) / 2
  const edge = Math.abs(u) ** 1.6
  return {
    key: `${ing}#${index}`,
    ing,
    u,
    v,
    d,
    scale: 0.8 + rnd() * 0.4,
    rot: rnd() * Math.PI * 2,
    variant: Math.floor(rnd() * variants),
    jitter: (rnd() - 0.5) * 0.075,
    depth: front ? 0 : clamp01(back * 0.78 + edge * 0.34),
  }
}

/**
 * How many pieces each ingredient gets. Shares follow volume rather than weight,
 * because volume is what the eye is counting, and every ingredient clears
 * MIN_GRAINS however small its share is.
 */
function counts(items: WeighedItem[], budget: number): Map<string, number> {
  const vols = items
    .filter((it) => BY_ID[it.ingredientId])
    .map((it) => ({ id: it.ingredientId, vol: it.grams * BY_ID[it.ingredientId].bulk }))
  const total = vols.reduce((s, v) => s + v.vol, 0) || 1

  const out = new Map<string, number>()
  for (const v of vols) {
    out.set(v.id, Math.max(MIN_GRAINS, Math.round((v.vol / total) * budget)))
  }

  // trim the biggest shares back until the budget is met; the minimums stay
  let sum = [...out.values()].reduce((s, n) => s + n, 0)
  while (sum > budget) {
    let biggest = ''
    let most = MIN_GRAINS
    for (const [id, n] of out) {
      if (n > most) {
        most = n
        biggest = id
      }
    }
    if (!biggest) break
    out.set(biggest, most - 1)
    sum--
  }
  return out
}

/**
 * The full pile for a blend, already sorted back-to-front so the render loop can
 * blit it in order without sorting every frame.
 */
export function planPile(items: WeighedItem[], budget: number, variants: number): Grain[] {
  const grains: Grain[] = []
  for (const [ing, n] of counts(items, budget)) {
    // the offset is what makes two ingredients interleave instead of tracing the
    // same path through the jar
    const offset = hash32(ing) % 65536
    for (let i = 0; i < n; i++) grains.push(makeGrain(ing, i, offset, variants))
  }
  grains.sort((a, b) => b.depth - a.depth)
  return grains
}

// ------------------------------------------------------------------ the surface

/**
 * Height of the heap's crown at horizontal offset `u`, as a multiple of the
 * level. Both the pieces and the dark mass drawn behind them read this, which is
 * what keeps the silhouette and the pieces on it agreeing.
 */
export function crownAt(u: number): number {
  return 1 + Math.sin(u * 3.3) * 0.055 + Math.sin(u * 8.1 + 1.7) * 0.032
}

/**
 * The bulk of the blend, in shadow. Without it the gaps between pieces show the
 * back of an empty jar and a full jar reads as a sparse scatter; with it the
 * pieces are the lit surface of something solid.
 */
export function drawPileMass(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: [number, number, number],
  level: number,
) {
  if (level <= 0.01) return
  const H = level * g.bodyH
  const steps = 72
  const over = g.maxHalf * 1.5

  /**
   * Only the crown is traced. The sides and the floor are drawn well outside the
   * glass and the whole shape is clipped to the jar's interior — tracing the
   * walls by hand instead left visible facets where the polyline cut the curve.
   */
  const path = new Path2D()
  path.moveTo(g.cx - over, g.bottom + g.maxHalf)
  for (let i = 0; i <= steps; i++) {
    const u = -1 + (2 * i) / steps
    const y = g.bottom - H * crownAt(u)
    const x = g.cx + u * Math.max(1, innerHalfAtY(g, y))
    if (i === 0) path.lineTo(x - over, y)
    path.lineTo(x, y)
    if (i === steps) path.lineTo(x + over, y)
  }
  path.lineTo(g.cx + over, g.bottom + g.maxHalf)
  path.closePath()

  ctx.save()
  ctx.clip(g.inner)
  const body = ctx.createLinearGradient(0, g.bottom - H, 0, g.bottom)
  body.addColorStop(0, rgba(mix(color, BLACK, 0.5), 0.84))
  body.addColorStop(0.4, rgba(mix(color, BLACK, 0.68), 0.93))
  body.addColorStop(1, rgba(mix(color, BLACK, 0.82), 0.97))
  ctx.fillStyle = body
  ctx.fill(path)

  // the crown is the only part of a heap the window light reaches
  ctx.globalCompositeOperation = 'lighter'
  const lit = ctx.createLinearGradient(0, g.bottom - H * 1.04, 0, g.bottom - H * 0.66)
  lit.addColorStop(0, rgba(mix(color, WHITE, 0.4), 0.22))
  lit.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lit
  ctx.fill(path)
  ctx.restore()
}
