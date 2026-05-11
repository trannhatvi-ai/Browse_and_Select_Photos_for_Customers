import {
  buildCloudinaryUsagePayload,
  extractCloudinaryStorageUsage,
  formatBytes,
  getCloudinaryUsageErrorCode,
  isCloudinaryUsageNetworkError,
} from '../cloudinary-usage'

describe('cloudinary usage helpers', () => {
  it('extracts storage usage and limit from Cloudinary admin API responses', () => {
    const result = extractCloudinaryStorageUsage({
      storage: {
        usage: 1024 * 1024 * 1024,
        limit: 25 * 1024 * 1024 * 1024,
      },
    })

    expect(result).toEqual({
      usedBytes: 1024 * 1024 * 1024,
      limitBytes: 25 * 1024 * 1024 * 1024,
    })
  })

  it('treats small Cloudinary credit limits as GB instead of raw bytes', () => {
    const result = extractCloudinaryStorageUsage({
      storage: {
        usage: 169.53 * 1024 * 1024,
      },
      credits: {
        limit: 25,
      },
    })

    expect(result.limitBytes).toBe(25 * 1024 * 1024 * 1024)
  })

  it('builds a display payload with shared-admin mode and source label', () => {
    const result = buildCloudinaryUsagePayload({
      usedBytes: 5 * 1024 * 1024 * 1024,
      limitBytes: 25 * 1024 * 1024 * 1024,
      totalPhotos: 42,
      mode: 'shared-admin',
      source: 'cloudinary',
    })

    expect(result.usedFormatted).toBe('5 GB')
    expect(result.limitFormatted).toBe('25 GB')
    expect(result.percentage).toBe(20)
    expect(result.modeLabel).toBe('Đang dùng chung Cloudinary Admin')
    expect(result.sourceLabel).toBe('Số liệu Cloudinary thực tế')
  })

  it('formats zero bytes cleanly', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('detects aggregate Cloudinary network timeouts', () => {
    const error = {
      errors: [
        Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }),
      ],
    }

    expect(getCloudinaryUsageErrorCode(error)).toBe('ETIMEDOUT')
    expect(isCloudinaryUsageNetworkError(error)).toBe(true)
  })
})
