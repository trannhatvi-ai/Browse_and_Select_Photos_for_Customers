import { prisma } from '@/lib/db'

export type CloudinaryUsageMode = 'private' | 'shared-admin' | 'not-configured'

export interface CloudinaryUsageStatus {
  cloudinaryUsageMode: CloudinaryUsageMode
  adminSharedCloudinaryAvailable: boolean
  isUsingSharedCloudinary: boolean
}

type CloudinarySettings = {
  cloudinaryCloudName?: string | null
  cloudinaryApiKey?: string | null
  cloudinaryApiSecret?: string | null
}

function normalizeCredential(value?: string | null) {
  return value?.trim() || ''
}

export function hasCompleteCloudinaryCredentials(settings?: CloudinarySettings | null) {
  return Boolean(
    normalizeCredential(settings?.cloudinaryCloudName) &&
    normalizeCredential(settings?.cloudinaryApiKey) &&
    normalizeCredential(settings?.cloudinaryApiSecret)
  )
}

function hasCompleteEnvCloudinaryCredentials() {
  return Boolean(
    normalizeCredential(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
    normalizeCredential(process.env.CLOUDINARY_API_KEY) &&
    normalizeCredential(process.env.CLOUDINARY_API_SECRET)
  )
}

export async function getCloudinaryUsageStatusForSettings(
  settings: CloudinarySettings | null | undefined,
  userRole?: string | null
): Promise<CloudinaryUsageStatus> {
  const hasOwnCloudinaryCredentials = hasCompleteCloudinaryCredentials(settings)
  let adminSharedCloudinaryAvailable = false

  if (userRole !== 'ADMIN' && !hasOwnCloudinaryCredentials) {
    const adminSettings = await prisma.settings.findFirst({
      where: { user: { role: 'ADMIN' } },
      select: {
        cloudinaryCloudName: true,
        cloudinaryApiKey: true,
        cloudinaryApiSecret: true,
        allowSharedCloudinary: true,
      },
    })
    const isSharedAllowed = adminSettings?.allowSharedCloudinary ?? true
    adminSharedCloudinaryAvailable = isSharedAllowed && (
      hasCompleteCloudinaryCredentials(adminSettings) ||
      hasCompleteEnvCloudinaryCredentials()
    )
  }

  const cloudinaryUsageMode: CloudinaryUsageMode = hasOwnCloudinaryCredentials
    ? 'private'
    : adminSharedCloudinaryAvailable
      ? 'shared-admin'
      : 'not-configured'

  return {
    cloudinaryUsageMode,
    adminSharedCloudinaryAvailable,
    isUsingSharedCloudinary: cloudinaryUsageMode === 'shared-admin',
  }
}

export async function getCloudinaryUsageStatusForUser(
  userId: string,
  userRole?: string | null
) {
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  return getCloudinaryUsageStatusForSettings(settings, userRole)
}
