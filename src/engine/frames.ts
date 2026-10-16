import { type Affine, type Corner, type Point, distanceSquared, frameCorners, pointInFrame } from './geometry'

/**
 * The first frame is the reference frame: it marks where the whole picture is mapped from.
 * Every other frame receives a transformed copy of everything inside the reference frame.
 */
export type Frames = Affine[]

export interface FrameHit {
  index: number
  /** The corner being grabbed, or `null` when the frame body is grabbed. */
  corner: Corner | null
}

export type Random = () => number

/** Creates a reference frame in the middle plus three randomly placed child frames. */
export function createInitialFrames(width: number, height: number, random: Random = Math.random): Frames {
  let size = Math.min(width, height) / 3
  const frames: Frames = [{ a: size, b: 0, c: 0, d: size, e: (width - size) / 2, f: (height - size) / 2 }]

  // Start the child frames quite a bit smaller to prevent the fractal from exploding right away.
  size *= 0.6

  for (let i = 0; i < 3; i++) {
    const x = random() > 0.5 ? (width * (1 + random())) / 5 : (width * (4 - random())) / 5
    const y = random() > 0.5 ? (height * (1 + random())) / 5 : (height * (4 - random())) / 5
    frames.push(squareFrame(x, y, size, random() * Math.PI * 2))
    size *= 0.8 - random() * 0.1
  }

  return frames
}

/** Creates a randomly rotated child frame centered at the given point, sized relative to the reference frame. */
export function createRandomFrame(reference: Affine, center: Point, random: Random = Math.random): Affine {
  const size = (0.45 + random() * 0.2) * Math.hypot(reference.a, reference.c)
  return squareFrame(center.x, center.y, size, random() * Math.PI)
}

function squareFrame(cx: number, cy: number, size: number, angle: number): Affine {
  const a = size * Math.cos(angle)
  const b = size * Math.sin(angle)
  return { a, b, c: -b, d: a, e: cx - (a + b) / 2, f: cy - (a - b) / 2 }
}

/**
 * Finds the frame under a point. Corners within `cornerRadius` take precedence (the closest
 * one wins), after that the top-most frame containing the point.
 */
export function hitTest(frames: Frames, p: Point, cornerRadius: number): FrameHit | null {
  let best: FrameHit | null = null
  let bestDistance = cornerRadius * cornerRadius

  for (let i = frames.length - 1; i >= 0; i--) {
    frameCorners(frames[i]).forEach((corner, j) => {
      const distance = distanceSquared(p, corner)
      if (distance < bestDistance) {
        bestDistance = distance
        best = { index: i, corner: j as Corner }
      }
    })
  }
  if (best) return best

  for (let i = frames.length - 1; i >= 0; i--) {
    if (pointInFrame(p, frames[i])) return { index: i, corner: null }
  }
  return null
}
