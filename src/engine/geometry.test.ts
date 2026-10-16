import { describe, expect, it } from 'vitest'
import { type Affine, type Corner, type Point, apply, compose, dragCorner, frameCorners, invert, pinchTransform, pointInFrame } from './geometry'

const t: Affine = { a: 30, b: -10, c: 10, d: 30, e: 100, f: 50 }

function expectClose<T extends Point | Affine>(actual: T, expected: T) {
  for (const key of Object.keys(expected) as (keyof T)[]) {
    expect(actual[key]).toBeCloseTo(expected[key] as number, 9)
  }
}

/** The corner dragging math of the original (pre-TypeScript) version, for comparison. */
function legacyDragCorner(t: number[], corner: number, x: number, y: number): number[] {
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0, x4, y4
  switch (corner) {
    case 0:
      x1 = x; y1 = y; x3 = t[4] + t[0] + t[1]; y3 = t[5] + t[2] + t[3]
      x2 = (x1 + x3 + y3 - y1) / 2; y2 = (y1 + y3 + x1 - x3) / 2
      break
    case 1:
      x2 = x; y2 = y; x4 = t[4] + t[1]; y4 = t[5] + t[3]
      x1 = (x2 + x4 - y4 + y2) / 2; y1 = (y2 + y4 - x2 + x4) / 2
      x3 = (x2 + x4 + y4 - y2) / 2; y3 = (y2 + y4 + x2 - x4) / 2
      break
    case 2:
      x3 = x; y3 = y; x1 = t[4]; y1 = t[5]
      x2 = (x1 + x3 + y3 - y1) / 2; y2 = (y1 + y3 + x1 - x3) / 2
      break
    case 3:
      x4 = x; y4 = y; x2 = t[4] + t[0]; y2 = t[5] + t[2]
      x1 = (x2 + x4 - y4 + y2) / 2; y1 = (y2 + y4 - x2 + x4) / 2
      x3 = (x2 + x4 + y4 - y2) / 2; y3 = (y2 + y4 + x2 - x4) / 2
      break
  }
  return [x2 - x1, x3 - x2, y2 - y1, y3 - y2, x1, y1]
}

describe('compose', () => {
  it('applies the inner transform first', () => {
    const inner: Affine = { a: 2, b: 0, c: 0, d: 2, e: 1, f: 1 }
    const outer: Affine = { a: 0, b: -1, c: 1, d: 0, e: 5, f: 0 }
    const p = apply(inner, 3, 4)
    expectClose(apply(compose(outer, inner), 3, 4), apply(outer, p.x, p.y))
  })

  it('is undone by the inverse', () => {
    expectClose(compose(t, invert(t)), { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    expectClose(compose(invert(t), t), { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
  })
})

describe('frames', () => {
  it('has corners in clockwise order starting at the origin', () => {
    expect(frameCorners(t)).toEqual([
      { x: 100, y: 50 },
      { x: 130, y: 60 },
      { x: 120, y: 90 },
      { x: 90, y: 80 },
    ])
  })

  it('detects points inside', () => {
    expect(pointInFrame({ x: 110, y: 70 }, t)).toBe(true)
    expect(pointInFrame({ x: 95, y: 55 }, t)).toBe(false)
  })
})

describe('dragCorner', () => {
  it.each([0, 1, 2, 3] as Corner[])('matches the original implementation for corner %i', (corner) => {
    const legacy = legacyDragCorner([t.a, t.b, t.c, t.d, t.e, t.f], corner, 170, 20)
    const [a, b, c, d, e, f] = legacy
    expectClose(dragCorner(t, corner, { x: 170, y: 20 }), { a, b, c, d, e, f })
  })

  it.each([0, 1, 2, 3] as Corner[])('moves corner %i to the pointer, keeps the opposite one, and stays square', (corner) => {
    const p = { x: 170, y: 20 }
    const result = dragCorner(t, corner, p)
    const corners = frameCorners(result)
    expectClose(corners[corner], p)
    expectClose(corners[(corner + 2) % 4], frameCorners(t)[(corner + 2) % 4])
    expect(result.a).toBeCloseTo(result.d, 9)
    expect(result.b).toBeCloseTo(-result.c, 9)
  })
})

describe('pinchTransform', () => {
  it('pans when both fingers move together', () => {
    const result = pinchTransform({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 }, { x: 15, y: 5 })
    expectClose(result, { a: 1, b: 0, c: 0, d: 1, e: 5, f: 5 })
  })

  it('zooms around the midpoint when fingers spread', () => {
    const result = pinchTransform({ x: 40, y: 50 }, { x: 60, y: 50 }, { x: 30, y: 50 }, { x: 70, y: 50 })
    expectClose(apply(result, 50, 50), { x: 50, y: 50 })
    expectClose(apply(result, 60, 50), { x: 70, y: 50 })
  })
})
