import { createCanvas, loadImage, registerFont } from 'canvas'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Apply watermark to an image buffer.
 * - Draws studio logo (if provided) at specified opacity
 * - Overlays "PROOFS" text rotated -30 degrees
 * - Returns watermarked image buffer (JPEG)
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  opacity: number = 30,
  logoPath?: string
): Promise<Buffer> {
  const img = await loadImage(imageBuffer)

  // Create canvas matching image dimensions
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')

  // Draw original image
  ctx.drawImage(img, 0, 0)

  // Apply watermark opacity via globalAlpha
  ctx.globalAlpha = opacity / 100

  // Draw logo if provided
  if (logoPath) {
    try {
      const logo = await loadImage(logoPath)
      // Scale logo to reasonable size (e.g., 200px max width)
      const maxLogoWidth = Math.min(200, img.width * 0.3)
      const scale = maxLogoWidth / logo.width
      const logoWidth = logo.width * scale
      const logoHeight = logo.height * scale
      const logoX = (img.width - logoWidth) / 2
      const logoY = (img.height - logoHeight) / 2
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight)
    } catch (err) {
      console.warn('Failed to load watermark logo:', err)
    }
  }

  // Draw "PROOFS" text rotated
  ctx.save()
  ctx.translate(img.width / 2, img.height / 2)
  ctx.rotate((-30 * Math.PI) / 180)
  ctx.fillStyle = 'white'
  ctx.font = `bold ${Math.max(40, img.width / 10)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('PROOFS', 0, 0)
  ctx.restore()

  // Reset alpha and return as JPEG
  ctx.globalAlpha = 1
  return canvas.toBuffer('image/jpeg', { quality: 85 })
}
