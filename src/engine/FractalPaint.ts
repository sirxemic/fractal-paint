import { context2d } from './canvas'
import { Fractal } from './Fractal'
import { type FrameHit, type Frames, createInitialFrames, createRandomFrame, hitTest } from './frames'
import {
  type Affine,
  type Corner,
  type Point,
  compose,
  distanceSquared,
  dragCorner,
  pinchTransform,
  scaleAround,
  translation,
} from './geometry'
import { drawFrames } from './overlay'
import { Painter } from './Painter'

export type Tool = 'draw' | 'erase' | 'frames'

export interface SelectionState {
  /** Index of the selected frame, or `null` if no frame is selected. */
  index: number | null
  /** Whether the selected frame can be deleted (the reference frame cannot). */
  deletable: boolean
}

export interface FractalPaintOptions {
  onSelectionChange?: (selection: SelectionState) => void
}

/** Higher ratios look sharper but are too slow to render on most phones. */
const MAX_PIXEL_RATIO = 2
/** Number of iterations rendered after a change, after which rendering pauses to save power. */
const SETTLE_STEPS = 240
const DOUBLE_TAP_MS = 350
/** Distances in CSS pixels. */
const DOUBLE_TAP_DISTANCE = 24
const CORNER_RADIUS = { mouse: 8, other: 24 }
/** Zoom factor per pixel of wheel movement. */
const WHEEL_ZOOM_SPEED = 0.001
const PINCH_WHEEL_ZOOM_SPEED = 0.01

type Gesture =
  | { kind: 'paint' }
  | { kind: 'frame'; index: number; corner: Corner | null; last: Point }
  | { kind: 'pan'; last: Point }
  | { kind: 'pinch'; ids: [number, number] }

interface PointerDown {
  time: number
  point: Point
  type: string
}

/**
 * Ties the drawing, the fractal and the frame overlay together and handles all user input.
 * All coordinates are in canvas (device) pixels unless stated otherwise.
 */
export class FractalPaint {
  private readonly frames: Frames
  private readonly painter: Painter
  private readonly fractal: Fractal
  private readonly overlayCtx: CanvasRenderingContext2D
  private readonly pixelRatio: number
  private readonly abort = new AbortController()
  private readonly resizeObserver: ResizeObserver

  private tool: Tool = 'draw'
  private selected: number | null = null
  private readonly pointers = new Map<number, Point>()
  private gesture: Gesture | null = null
  private lastDown: PointerDown | null = null
  private hovering = false
  private shiftHeld = false
  private stepsLeft = SETTLE_STEPS
  private overlayDirty = true
  private animationFrame = 0

  constructor(
    private readonly host: HTMLElement,
    fractalCanvas: HTMLCanvasElement,
    private readonly overlayCanvas: HTMLCanvasElement,
    private readonly options: FractalPaintOptions = {},
  ) {
    this.pixelRatio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)
    const { width, height } = this.measure()

    for (const canvas of [fractalCanvas, overlayCanvas]) {
      canvas.width = width
      canvas.height = height
    }
    this.overlayCtx = context2d(overlayCanvas)
    this.frames = createInitialFrames(width, height)
    this.painter = new Painter(width, height, this.pixelRatio)
    this.fractal = new Fractal(fractalCanvas, this.painter.canvas, this.frames)
    this.fractal.reset()

    this.bindEvents()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()
    this.abort.abort()
  }

  setTool(tool: Tool): void {
    this.tool = tool
    this.cancelGesture()
    if (tool !== 'frames') this.select(null)
    this.updateCursor(null)
    this.overlayDirty = true
  }

  /** Adds a randomly rotated frame in the middle of the screen. */
  addFrame(): void {
    const { width, height } = this.overlayCanvas
    const jitter = () => (Math.random() - 0.5) * 0.2
    const center = { x: width * (0.5 + jitter()), y: height * (0.5 + jitter()) }
    this.frames.push(createRandomFrame(this.frames[0], center))
    this.select(this.frames.length - 1)
    this.invalidate()
  }

  deleteSelectedFrame(): void {
    if (this.selected === null || this.selected === 0) return
    this.frames.splice(this.selected, 1)
    this.select(null)
    this.fractal.reset()
    this.invalidate()
  }

  /** Replaces all frames by a new random set. */
  shuffleFrames(): void {
    const { width, height } = this.overlayCanvas
    this.frames.splice(0, this.frames.length, ...createInitialFrames(width, height))
    this.select(null)
    this.fractal.reset()
    this.invalidate()
  }

  clearDrawing(): void {
    this.cancelGesture()
    this.painter.clear()
    this.fractal.reset()
    this.invalidate()
  }

  loadImage(img: HTMLImageElement | ImageBitmap): void {
    this.cancelGesture()
    this.painter.loadImage(img)
    this.fractal.reset()
    this.invalidate()
  }

  // --- Rendering ---------------------------------------------------------------------------

  private readonly tick = () => {
    if (this.stepsLeft > 0) {
      this.fractal.step()
      this.stepsLeft--
    }
    if (this.overlayDirty) {
      this.drawOverlay()
      this.overlayDirty = false
    }
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private invalidate(): void {
    this.stepsLeft = SETTLE_STEPS
    this.overlayDirty = true
  }

  private drawOverlay(): void {
    const ctx = this.overlayCtx
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height)

    const visible = this.tool === 'frames' || this.shiftHeld || this.hovering || this.gesture?.kind === 'frame'
    if (!visible) return

    drawFrames(ctx, this.frames, {
      pixelRatio: this.pixelRatio,
      selected: this.selected,
      showHandles: this.tool === 'frames',
    })
  }

  private measure(): { width: number; height: number } {
    return {
      width: Math.max(1, Math.round(this.host.clientWidth * this.pixelRatio)),
      height: Math.max(1, Math.round(this.host.clientHeight * this.pixelRatio)),
    }
  }

  private resize(): void {
    const { width, height } = this.measure()
    const { width: oldWidth, height: oldHeight } = this.overlayCanvas
    if (width === oldWidth && height === oldHeight) return

    // Keep the scene centered, as the drawing is.
    const shift = translation(Math.round((width - oldWidth) / 2), Math.round((height - oldHeight) / 2))
    this.frames.forEach((frame, i) => (this.frames[i] = compose(shift, frame)))

    this.painter.resize(width, height)
    this.fractal.resize(width, height)
    this.overlayCanvas.width = width
    this.overlayCanvas.height = height
    this.invalidate()
  }

  // --- Scene manipulation ------------------------------------------------------------------

  /** Applies a transformation to the drawing and all frames, i.e. pans or zooms the scene. */
  private transformScene(t: Affine): void {
    this.painter.transform(t)
    this.fractal.transform(t)
    this.frames.forEach((frame, i) => (this.frames[i] = compose(t, frame)))
    this.invalidate()
  }

  /** Removes the frame at a point, or adds a new frame there if there is none. */
  private toggleFrameAt(p: Point): void {
    const hit = hitTest(this.frames, p, 0)
    if (hit && hit.index > 0) {
      this.frames.splice(hit.index, 1)
      this.select(null)
    } else {
      this.frames.push(createRandomFrame(this.frames[0], p))
      this.select(this.tool === 'frames' ? this.frames.length - 1 : null)
    }
    this.fractal.reset()
    this.invalidate()
  }

  private select(index: number | null): void {
    if (index === this.selected) return
    this.selected = index
    this.overlayDirty = true
    this.options.onSelectionChange?.({ index, deletable: index !== null && index > 0 })
  }

  // --- Input -------------------------------------------------------------------------------

  private bindEvents(): void {
    const canvas = this.overlayCanvas
    const options = { signal: this.abort.signal }

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e), options)
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e), options)
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e), options)
    canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e), options)
    canvas.addEventListener('pointerenter', (e) => this.setHovering(e.pointerType === 'mouse'), options)
    canvas.addEventListener('pointerleave', () => this.setHovering(false), options)
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { ...options, passive: false })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), options)

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Shift' || e.shiftKey === this.shiftHeld) return
      this.shiftHeld = e.shiftKey
      this.overlayDirty = true
    }
    window.addEventListener('keydown', onKey, options)
    window.addEventListener('keyup', onKey, options)
    window.addEventListener('blur', () => onKey(new KeyboardEvent('keyup', { key: 'Shift' })), options)
  }

  private toCanvas(e: PointerEvent | WheelEvent): Point {
    const rect = this.overlayCanvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * this.overlayCanvas.width) / rect.width,
      y: ((e.clientY - rect.top) * this.overlayCanvas.height) / rect.height,
    }
  }

  private onPointerDown(e: PointerEvent): void {
    // Only primary, middle and secondary mouse buttons; pens may report the eraser as button 5.
    if (e.button > 2 && e.button !== 5) return
    if (this.pointers.size >= 2) return

    this.overlayCanvas.setPointerCapture(e.pointerId)
    const p = this.toCanvas(e)
    this.pointers.set(e.pointerId, p)

    if (this.pointers.size === 2) {
      this.startPinch()
      return
    }

    if (this.isDoubleTap(e, p)) {
      this.lastDown = null
      this.toggleFrameAt(p)
      return
    }
    this.lastDown = { time: e.timeStamp, point: p, type: e.pointerType }

    const editing = this.tool === 'frames' || e.shiftKey || e.button === 1
    if (editing) {
      const hit = e.button === 1 ? null : hitTest(this.frames, p, this.cornerRadius(e.pointerType))
      this.select(hit?.index ?? null)
      this.gesture = hit ? { kind: 'frame', index: hit.index, corner: hit.corner, last: p } : { kind: 'pan', last: p }
      this.overlayDirty = true
    } else {
      const erase = this.tool === 'erase' || e.button === 2 || e.button === 5
      this.painter.begin(p, erase, e.timeStamp)
      this.gesture = { kind: 'paint' }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.toCanvas(e)
    const previous = this.pointers.get(e.pointerId)
    if (!previous) {
      if (e.pointerType === 'mouse') this.updateCursor(p, e.shiftKey)
      return
    }
    this.pointers.set(e.pointerId, p)

    const gesture = this.gesture
    switch (gesture?.kind) {
      case 'paint': {
        const events = e.getCoalescedEvents?.() ?? []
        for (const event of events.length ? events : [e]) {
          this.painter.extend(this.toCanvas(event), event.timeStamp)
        }
        this.invalidate()
        break
      }
      case 'frame': {
        const frame = this.frames[gesture.index]
        this.frames[gesture.index] =
          gesture.corner === null
            ? compose(translation(p.x - gesture.last.x, p.y - gesture.last.y), frame)
            : dragCorner(frame, gesture.corner, p)
        gesture.last = p
        this.fractal.reset()
        this.invalidate()
        break
      }
      case 'pan':
        this.transformScene(translation(p.x - gesture.last.x, p.y - gesture.last.y))
        gesture.last = p
        break
      case 'pinch':
        this.updatePinch(e.pointerId, previous, p)
        break
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointers.delete(e.pointerId)) return

    if (this.gesture?.kind === 'paint') this.painter.end()
    // Once a gesture ends, lifting or keeping other fingers down does not start a new one.
    this.gesture = null
    this.overlayDirty = true
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    // Normalize line and page based scrolling to pixels.
    const delta = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1)
    // Trackpad pinch gestures arrive as wheel events with the ctrl key set.
    const scale = Math.exp(-delta * (e.ctrlKey ? PINCH_WHEEL_ZOOM_SPEED : WHEEL_ZOOM_SPEED))
    const p = this.toCanvas(e)
    this.transformScene(scaleAround(scale, p.x, p.y))
  }

  private startPinch(): void {
    // The first finger may have started drawing before the second one landed; undo that.
    if (this.gesture?.kind === 'paint') this.painter.cancel()
    const [first, second] = [...this.pointers.keys()]
    this.gesture = { kind: 'pinch', ids: [first, second] }
    this.lastDown = null
    this.overlayDirty = true
  }

  private updatePinch(id: number, previous: Point, p: Point): void {
    if (this.gesture?.kind !== 'pinch') return
    const [a, b] = this.gesture.ids
    const other = this.pointers.get(id === a ? b : a)
    if (other) this.transformScene(pinchTransform(previous, other, p, other))
  }

  private cancelGesture(): void {
    if (this.gesture?.kind === 'paint') this.painter.end()
    this.gesture = null
  }

  private isDoubleTap(e: PointerEvent, p: Point): boolean {
    const last = this.lastDown
    // Double-clicking works in any tool; double-tapping only when editing frames, as it would
    // otherwise get in the way of drawing dots.
    if (!last || last.type !== e.pointerType) return false
    if (e.pointerType !== 'mouse' && this.tool !== 'frames') return false
    const maxDistance = DOUBLE_TAP_DISTANCE * this.pixelRatio
    return e.timeStamp - last.time < DOUBLE_TAP_MS && distanceSquared(p, last.point) < maxDistance ** 2
  }

  private cornerRadius(pointerType: string): number {
    return (pointerType === 'mouse' ? CORNER_RADIUS.mouse : CORNER_RADIUS.other) * this.pixelRatio
  }

  private setHovering(hovering: boolean): void {
    this.hovering = hovering
    this.overlayDirty = true
  }

  private updateCursor(p: Point | null, shiftKey = false): void {
    let cursor = 'crosshair'
    if (this.tool === 'frames' || shiftKey) {
      const hit: FrameHit | null = p && hitTest(this.frames, p, this.cornerRadius('mouse'))
      cursor = hit ? (hit.corner === null ? 'move' : 'pointer') : 'grab'
    }
    this.overlayCanvas.style.cursor = cursor
  }
}
