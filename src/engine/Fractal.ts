import { context2d, createCanvas } from './canvas'
import { type Frames } from './frames'
import { type Affine, IDENTITY, compose, invert, setCanvasTransform } from './geometry'

/**
 * Renders the fractal by iterating: every step draws the source drawing plus copies of the
 * previous step mapped from the reference frame into each child frame.
 */
export class Fractal {
  /** Where to draw the source drawing, for pans and zooms not yet applied to the drawing itself. */
  sourceTransform: Affine = IDENTITY

  private readonly ctx: CanvasRenderingContext2D
  private readonly buffer: HTMLCanvasElement
  private readonly bufferCtx: CanvasRenderingContext2D
  /** Pans and zooms since the last step, still to be applied to the previous iteration. */
  private pendingTransform: Affine = IDENTITY

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly source: HTMLCanvasElement,
    private readonly frames: Frames,
  ) {
    this.ctx = context2d(canvas)
    this.buffer = createCanvas(canvas.width, canvas.height)
    this.bufferCtx = context2d(this.buffer)
  }

  /** Throws away all iterations and starts over from the source drawing. */
  reset(): void {
    const { ctx, canvas } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    this.drawSource(ctx)
    this.pendingTransform = IDENTITY
  }

  step(): void {
    const { ctx, bufferCtx, canvas, buffer, frames } = this
    const [reference, ...children] = frames
    const fromReference = compose(invert(reference), this.pendingTransform)
    this.pendingTransform = IDENTITY

    bufferCtx.clearRect(0, 0, buffer.width, buffer.height)
    this.drawSource(bufferCtx)
    if (Number.isFinite(fromReference.a)) {
      for (const child of children) {
        setCanvasTransform(bufferCtx, compose(child, fromReference))
        bufferCtx.drawImage(canvas, 0, 0)
      }
      bufferCtx.setTransform(1, 0, 0, 1, 0, 0)
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(buffer, 0, 0)
  }

  /**
   * Transforms the current iteration, so panning and zooming do not need to start over.
   * This is cheap: the transformation is folded into the next step.
   */
  transform(t: Affine): void {
    this.pendingTransform = compose(t, this.pendingTransform)
  }

  resize(width: number, height: number): void {
    this.canvas.width = this.buffer.width = width
    this.canvas.height = this.buffer.height = height
    this.reset()
  }

  private drawSource(ctx: CanvasRenderingContext2D): void {
    setCanvasTransform(ctx, this.sourceTransform)
    ctx.drawImage(this.source, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
}
