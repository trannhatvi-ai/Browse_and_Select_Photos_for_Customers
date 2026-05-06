// Mock out canvas for build to succeed
export async function applyWatermark(
  imageBuffer: Buffer,
  opacity: number = 30,
  logoPath?: string
): Promise<Buffer> {
  // Return original buffer (watermark feature requires proper canvas bindings)
  return imageBuffer
}
