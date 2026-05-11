import type { CloudinaryUsageMode } from '@/lib/cloudinary-usage-status'

export type CloudinaryUsageSource = 'cloudinary' | 'database-estimate'

export const CLOUDINARY_FREE_LIMIT_BYTES = 25 * 1024 * 1024 * 1024

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function numericValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function normalizeCloudinaryLimitBytes(value: number | null) {
  if (!value || value <= 0) return CLOUDINARY_FREE_LIMIT_BYTES

  // Cloudinary's usage response can expose plan/credit limits as a small
  // number such as 25. For this dashboard that means the 25 GB free storage
  // quota, not 25 raw bytes.
  if (value < 1024 * 1024) return value * 1024 * 1024 * 1024

  return value
}

export function extractCloudinaryStorageUsage(response: any) {
  const storage = response?.storage ?? {}
  const usedBytes = numericValue(storage.usage)
    ?? numericValue(storage.used)
    ?? numericValue(storage.bytes)
    ?? 0
  const rawLimit = numericValue(storage.limit)
    ?? numericValue(response?.credits?.limit)

  return { usedBytes, limitBytes: normalizeCloudinaryLimitBytes(rawLimit) }
}

export function cloudinaryModeLabel(mode: CloudinaryUsageMode) {
  if (mode === 'private') return 'Cloudinary riêng'
  if (mode === 'shared-admin') return 'Đang dùng chung Cloudinary Admin'
  return 'Chưa cấu hình Cloudinary'
}

export function usageSourceLabel(source: CloudinaryUsageSource) {
  return source === 'cloudinary'
    ? 'Số liệu Cloudinary thực tế'
    : 'Ước tính từ dữ liệu ảnh trong hệ thống'
}

export function buildCloudinaryUsagePayload({
  usedBytes,
  limitBytes,
  totalPhotos,
  mode,
  source,
}: {
  usedBytes: number
  limitBytes: number
  totalPhotos: number
  mode: CloudinaryUsageMode
  source: CloudinaryUsageSource
}) {
  const safeLimit = limitBytes || CLOUDINARY_FREE_LIMIT_BYTES

  return {
    used: usedBytes,
    limit: safeLimit,
    usedFormatted: formatBytes(usedBytes),
    limitFormatted: formatBytes(safeLimit),
    percentage: Math.min(100, Math.round((usedBytes / safeLimit) * 100)),
    totalPhotos,
    mode,
    source,
    modeLabel: cloudinaryModeLabel(mode),
    sourceLabel: usageSourceLabel(source),
    isEstimate: source === 'database-estimate',
  }
}

export function getCloudinaryUsageErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null

  const directCode = (error as { code?: unknown }).code
  if (typeof directCode === 'string') return directCode

  const nestedErrors = (error as { errors?: unknown }).errors
  if (!Array.isArray(nestedErrors)) return null

  for (const nestedError of nestedErrors) {
    if (!nestedError || typeof nestedError !== 'object') continue
    const nestedCode = (nestedError as { code?: unknown }).code
    if (typeof nestedCode === 'string') return nestedCode
  }

  return null
}

export function isCloudinaryUsageNetworkError(error: unknown) {
  const code = getCloudinaryUsageErrorCode(error)
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND' || code === 'EAI_AGAIN'
}
