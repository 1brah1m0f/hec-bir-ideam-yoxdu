/**
 * Painting helpers shared by every vessel renderer — colour arithmetic, the
 * gradient cache, the radial blob sprite, and profile sampling.
 *
 * Used by `jar.ts`, the vessel the site mounts. `glass.ts` — the armudu tea
 * glass the site showed before — is kept for reference, is imported by nothing,
 * and carries its own copies so it stays runnable on its own.
 */

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

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

/**
 * Turns a sparse [t, halfWidth] silhouette into a smooth sampler. Catmull-Rom
 * so the control points are hit exactly — a spline that missed them would make
 * the waist and the widest point drift away from the measurements.
 */
export function sampleProfile(profile: [number, number][], t: number): number {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t
  let i = 0
  while (i < profile.length - 2 && profile[i + 1][0] < clamped) i++
  const [t1, v1] = profile[i]
  const [t2, v2] = profile[i + 1]
  const v0 = profile[Math.max(0, i - 1)][1]
  const v3 = profile[Math.min(profile.length - 1, i + 2)][1]
  const local = t2 === t1 ? 0 : (clamped - t1) / (t2 - t1)
  return Math.max(0, catmull(v0, v1, v2, v3, local))
}

/** Clips a bounds rect to the reference box, so a cached layer is never oversized. */
export function clampBounds(b: Bounds, w: number, h: number): Bounds {
  const x = Math.max(0, Math.floor(b.x))
  const y = Math.max(0, Math.floor(b.y))
  return {
    x,
    y,
    w: Math.min(w - x, Math.ceil(b.w + (b.x - x))),
    h: Math.min(h - y, Math.ceil(b.h + (b.y - y))),
  }
}
