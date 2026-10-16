import { context2d, createCanvas, resizeKeepingCenter, transformCanvas } from './canvas'
import { type Affine, type Point } from './geometry'

/** Manages the source drawing: white strokes on a transparent background. */
export class Painter {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  /** Copy of the drawing taken when a stroke starts, so the stroke can be cancelled. */
  private readonly backup: HTMLCanvasElement
  private readonly scratch: HTMLCanvasElement
  private stroke: { erase: boolean; last: Point; time: number } | null = null

  constructor(
    width: number,
    height: number,
    private readonly pixelRatio: number,
  ) {
    this.canvas = createCanvas(width, height)
    this.ctx = context2d(this.canvas)
    this.backup = createCanvas(width, height)
    this.scratch = createCanvas(width, height)
  }

  begin(p: Point, erase: boolean, time: number): void {
    const backupCtx = context2d(this.backup)
    backupCtx.clearRect(0, 0, this.backup.width, this.backup.height)
    backupCtx.drawImage(this.canvas, 0, 0)

    this.stroke = { erase, last: p, time }
  }

  extend(p: Point, time: number): void {
    const { stroke, ctx } = this
    if (!stroke) return

    // Brush size depends on the speed of the pointer: faster strokes are thicker.
    // Measured per 16ms so the result does not depend on the event rate.
    const distance = Math.hypot(p.x - stroke.last.x, p.y - stroke.last.y) / this.pixelRatio
    const speed = (distance / Math.max(1, time - stroke.time)) * 16
    const width = stroke.erase ? Math.min(30, 6 + Math.sqrt(speed)) : Math.min(6, Math.max(0.5, Math.sqrt(speed)))

    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
    ctx.strokeStyle = 'white'
    ctx.lineCap = 'round'
    ctx.lineWidth = width * this.pixelRatio
    ctx.beginPath()
    ctx.moveTo(stroke.last.x, stroke.last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'

    stroke.last = p
    stroke.time = time
  }

  end(): void {
    this.stroke = null
  }

  /** Ends the current stroke and undoes everything it drew. */
  cancel(): void {
    if (!this.stroke) return
    this.stroke = null
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.drawImage(this.backup, 0, 0)
  }

  /** Transforms the drawing, e.g. when panning or zooming. */
  transform(t: Affine): void {
    transformCanvas(this.canvas, this.scratch, t)
  }

  clear(): void {
    this.stroke = null
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  resize(width: number, height: number): void {
    resizeKeepingCenter(this.canvas, width, height)
    this.backup.width = this.scratch.width = width
    this.backup.height = this.scratch.height = height
  }

  /** Replaces the drawing with an image, converted to white with brightness as opacity. */
  loadImage(img: HTMLImageElement | ImageBitmap): void {
    const { ctx, canvas } = this
    const scale = Math.min(1, canvas.width / img.width, canvas.height / img.height)
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    const x = Math.round((canvas.width - width) / 2)
    const y = Math.round((canvas.height - height) / 2)

    this.clear()
    if (width === 0 || height === 0) return
    ctx.drawImage(img, x, y, width, height)

    const imageData = ctx.getImageData(x, y, width, height)
    const pixels = imageData.data
    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = Math.max(pixels[i], pixels[i + 1], pixels[i + 2])
      pixels[i + 3] = (brightness * pixels[i + 3]) / 255
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
    }
    ctx.putImageData(imageData, x, y)
  }
}
