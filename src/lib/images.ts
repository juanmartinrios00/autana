/**
 * Compresión de imágenes en el navegador, antes de subirlas.
 *
 * Dos motivos, los dos importantes:
 *
 * 1. Costo. Una foto de celular pesa ~4 MB; redimensionada a 1600px y
 *    convertida a WebP queda en ~200 KB. Son 20 veces menos storage y menos
 *    transferencia, y carga mucho más rápido con datos móviles.
 *
 * 2. Privacidad. Reencodear la imagen en un canvas descarta el EXIF, y con él
 *    las coordenadas GPS que los celulares meten en cada foto. Sin esto
 *    estaríamos publicando la dirección de la casa del vendedor.
 */

export interface CompressedImage {
  blob: Blob
  /** URL temporal para la vista previa. Hay que revocarla al descartar. */
  previewUrl: string
  width: number
  height: number
  bytes: number
}

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export class ImageTooLargeError extends Error {
  constructor() {
    super('La foto supera los 12 MB.')
    this.name = 'ImageTooLargeError'
  }
}

export class UnsupportedImageError extends Error {
  constructor() {
    super('El archivo no es una imagen válida.')
    this.name = 'UnsupportedImageError'
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    throw new UnsupportedImageError()
  }
}

function fit(width: number, height: number, max: number) {
  if (width <= max && height <= max) return { width, height }
  const scale = max / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export async function compressImage(
  file: File,
  { maxSize = 1600, quality = 0.82 } = {},
): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new UnsupportedImageError()
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageTooLargeError()

  const bitmap = await decode(file)
  const { width, height } = fit(bitmap.width, bitmap.height, maxSize)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new UnsupportedImageError()
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })
  if (!blob) throw new UnsupportedImageError()

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    bytes: blob.size,
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
