import { applyWatermark } from '@/lib/watermark'

// Mock canvas since we can't run it in test environment easily
describe('Watermark', () => {
  it('should return buffer', async () => {
    // Create a simple 1x1 red pixel PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    const result = await applyWatermark(pngBuffer, 50)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})
