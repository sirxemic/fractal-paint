import { describe, expect, it } from 'vitest'
import { createInitialFrames, createRandomFrame, hitTest } from './frames'
import { apply } from './geometry'

/** Deterministic pseudo random numbers. */
function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

describe('createInitialFrames', () => {
  it('creates a centered reference frame and three smaller child frames', () => {
    const frames = createInitialFrames(900, 600, seeded())
    expect(frames).toHaveLength(4)
    expect(frames[0]).toEqual({ a: 200, b: 0, c: 0, d: 200, e: 350, f: 200 })
    for (const frame of frames.slice(1)) {
      expect(Math.hypot(frame.a, frame.c)).toBeLessThan(200)
    }
  })
})

describe('createRandomFrame', () => {
  it('centers the frame on the given point', () => {
    const frame = createRandomFrame({ a: 100, b: 0, c: 0, d: 100, e: 0, f: 0 }, { x: 40, y: 70 }, seeded(7))
    const center = apply(frame, 0.5, 0.5)
    expect(center.x).toBeCloseTo(40, 9)
    expect(center.y).toBeCloseTo(70, 9)
  })
})

describe('hitTest', () => {
  const frames = [
    { a: 100, b: 0, c: 0, d: 100, e: 0, f: 0 },
    { a: 50, b: 0, c: 0, d: 50, e: 95, f: 95 },
  ]

  it('prefers the closest corner within range', () => {
    expect(hitTest(frames, { x: 99, y: 99 }, 10)).toEqual({ index: 0, corner: 2 })
    expect(hitTest(frames, { x: 96, y: 96 }, 10)).toEqual({ index: 1, corner: 0 })
  })

  it('falls back to the top-most frame containing the point', () => {
    expect(hitTest(frames, { x: 110, y: 120 }, 10)).toEqual({ index: 1, corner: null })
    expect(hitTest(frames, { x: 30, y: 50 }, 10)).toEqual({ index: 0, corner: null })
    expect(hitTest(frames, { x: 300, y: 300 }, 10)).toBeNull()
  })
})
