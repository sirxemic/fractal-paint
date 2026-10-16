import { type Frames } from './frames'
import { type Affine, frameCorners } from './geometry'

export interface OverlayOptions {
  pixelRatio: number
  selected: number | null
  showHandles: boolean
}

const REFERENCE_COLOR = '#ffd60a'
const SELECTED_COLOR = '#4cc9f0'
const FRAME_COLOR = '#ffffff'

/** Draws the outlines of all frames, with arrows indicating their orientation. */
export function drawFrames(ctx: CanvasRenderingContext2D, frames: Frames, options: OverlayOptions): void {
  const { pixelRatio, selected, showHandles } = options

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // First pass draws a dark outline, second pass the colored line on top of it.
  for (const outline of [true, false]) {
    ctx.lineWidth = (outline ? 4 : 2) * pixelRatio
    frames.forEach((frame, i) => {
      ctx.strokeStyle = outline ? 'black' : frameColor(i, selected)
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      traceFrame(ctx, frame, pixelRatio)
      ctx.stroke()

      if (showHandles) {
        const radius = (outline ? 4.5 : 3.5) * pixelRatio
        for (const corner of frameCorners(frame)) {
          ctx.beginPath()
          ctx.arc(corner.x, corner.y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })
  }
}

function frameColor(index: number, selected: number | null): string {
  if (index === selected) return SELECTED_COLOR
  return index === 0 ? REFERENCE_COLOR : FRAME_COLOR
}

function traceFrame(ctx: CanvasRenderingContext2D, t: Affine, pixelRatio: number): void {
  const [p0, p1, p2, p3] = frameCorners(t)
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.closePath()

  // Arrow heads halfway along both axes of the frame.
  for (const [dx, dy] of [
    [t.a, t.c],
    [t.b, t.d],
  ]) {
    const mx = t.e + dx / 2
    const my = t.f + dy / 2
    const length = Math.hypot(dx, dy)
    const s = length > 10 * pixelRatio ? (5 * pixelRatio) / length : 0.5
    ctx.moveTo(mx - (dx - dy) * s, my - (dy + dx) * s)
    ctx.lineTo(mx, my)
    ctx.lineTo(mx - (dx + dy) * s, my - (dy - dx) * s)
  }
}
