import { type Affine, setCanvasTransform } from './geometry'

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not supported')
  return ctx
}

/** Resizes a canvas while keeping its content centered (cropping or padding as needed). */
export function resizeKeepingCenter(canvas: HTMLCanvasElement, width: number, height: number): void {
  const copy = createCanvas(canvas.width, canvas.height)
  context2d(copy).drawImage(canvas, 0, 0)
  const dx = (width - canvas.width) / 2
  const dy = (height - canvas.height) / 2
  canvas.width = width
  canvas.height = height
  context2d(canvas).drawImage(copy, Math.round(dx), Math.round(dy))
}

/** Transforms a canvas' content in place, using `scratch` (of the same size) as temporary storage. */
export function transformCanvas(canvas: HTMLCanvasElement, scratch: HTMLCanvasElement, t: Affine): void {
  const scratchCtx = context2d(scratch)
  scratchCtx.clearRect(0, 0, scratch.width, scratch.height)
  scratchCtx.drawImage(canvas, 0, 0)

  const ctx = context2d(canvas)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  setCanvasTransform(ctx, t)
  ctx.drawImage(scratch, 0, 0)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}
