export interface Point {
  x: number
  y: number
}

/**
 * A 2D affine transformation:
 *
 *   x' = a·x + b·y + e
 *   y' = c·x + d·y + f
 *
 * A frame is an affine transform applied to the unit square, so its corners are
 * (e, f), (e + a, f + c), (e + a + b, f + c + d) and (e + b, f + d).
 */
export interface Affine {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

/** Corner indices, clockwise starting from the frame origin. */
export type Corner = 0 | 1 | 2 | 3

export const IDENTITY: Readonly<Affine> = Object.freeze({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })

export function affine(a: number, b: number, c: number, d: number, e: number, f: number): Affine {
  return { a, b, c, d, e, f }
}

export function translation(dx: number, dy: number): Affine {
  return affine(1, 0, 0, 1, dx, dy)
}

/** Uniform scale around a fixed point. */
export function scaleAround(scale: number, cx: number, cy: number): Affine {
  return affine(scale, 0, 0, scale, (1 - scale) * cx, (1 - scale) * cy)
}

/** Returns `outer ∘ inner`, i.e. the transform that applies `inner` first. */
export function compose(outer: Affine, inner: Affine): Affine {
  return {
    a: outer.a * inner.a + outer.b * inner.c,
    b: outer.a * inner.b + outer.b * inner.d,
    c: outer.c * inner.a + outer.d * inner.c,
    d: outer.c * inner.b + outer.d * inner.d,
    e: outer.e + outer.a * inner.e + outer.b * inner.f,
    f: outer.f + outer.c * inner.e + outer.d * inner.f,
  }
}

export function invert(t: Affine): Affine {
  const det = t.a * t.d - t.b * t.c
  const a = t.d / det
  const b = -t.b / det
  const c = -t.c / det
  const d = t.a / det
  return { a, b, c, d, e: -(a * t.e + b * t.f), f: -(c * t.e + d * t.f) }
}

export function apply(t: Affine, x: number, y: number): Point {
  return { x: t.a * x + t.b * y + t.e, y: t.c * x + t.d * y + t.f }
}

/** Passes an `Affine` to a canvas context, which orders its parameters differently. */
export function setCanvasTransform(ctx: CanvasRenderingContext2D, t: Affine): void {
  ctx.setTransform(t.a, t.c, t.b, t.d, t.e, t.f)
}

export function frameCorners(t: Affine): [Point, Point, Point, Point] {
  return [apply(t, 0, 0), apply(t, 1, 0), apply(t, 1, 1), apply(t, 0, 1)]
}

/** Builds a frame from three consecutive corners (origin, +x and diagonal). */
export function frameFromCorners(p0: Point, p1: Point, p2: Point): Affine {
  return {
    a: p1.x - p0.x,
    c: p1.y - p0.y,
    b: p2.x - p1.x,
    d: p2.y - p1.y,
    e: p0.x,
    f: p0.y,
  }
}

export function distanceSquared(p: Point, q: Point): number {
  return (p.x - q.x) ** 2 + (p.y - q.y) ** 2
}

function pointInTriangle(p: Point, p1: Point, p2: Point, p3: Point): boolean {
  const b1 = (p.x - p2.x) * (p1.y - p2.y) - (p1.x - p2.x) * (p.y - p2.y) < 0
  const b2 = (p.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p.y - p3.y) < 0
  const b3 = (p.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p.y - p1.y) < 0
  return b1 === b2 && b2 === b3
}

export function pointInFrame(p: Point, t: Affine): boolean {
  const [p0, p1, p2, p3] = frameCorners(t)
  return pointInTriangle(p, p0, p1, p3) || pointInTriangle(p, p2, p1, p3)
}

/**
 * Returns the square frame obtained by dragging one of `t`'s corners to `p` while keeping
 * the opposite corner fixed. Frames therefore stay squares (rotated and scaled).
 */
export function dragCorner(t: Affine, corner: Corner, p: Point): Affine {
  const corners = frameCorners(t)
  corners[corner] = p

  // Two opposite corners span a diagonal. The other two corners follow from rotating
  // half of that diagonal by 90° around its midpoint.
  const [from, to] = corner % 2 === 0 ? [corners[0], corners[2]] : [corners[3], corners[1]]
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const rx = (to.y - from.y) / 2
  const ry = -(to.x - from.x) / 2
  const rotated = { x: mid.x + rx, y: mid.y + ry }

  if (corner % 2 === 0) {
    // Diagonal 0 → 2: the rotated point is corner 1.
    return frameFromCorners(corners[0], rotated, corners[2])
  }
  // Diagonal 3 → 1: the rotated point is corner 0, corner 2 lies opposite of it.
  return frameFromCorners(rotated, corners[1], { x: mid.x - rx, y: mid.y - ry })
}

/**
 * The pan and zoom described by two fingers moving from (a, b) to (a2, b2): the midpoint
 * follows the fingers and the scale follows their distance. Rotation is ignored.
 */
export function pinchTransform(a: Point, b: Point, a2: Point, b2: Point): Affine {
  const oldDistance = Math.sqrt(distanceSquared(a, b))
  const scale = oldDistance < 1 ? 1 : Math.sqrt(distanceSquared(a2, b2)) / oldDistance
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const mid2 = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 }
  return compose(translation(mid2.x - mid.x, mid2.y - mid.y), scaleAround(scale, mid.x, mid.y))
}
