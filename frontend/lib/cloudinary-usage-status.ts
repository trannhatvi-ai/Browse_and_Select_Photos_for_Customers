import { prisma } from '@/lib/db'
import { isMissingCloudinaryAccountTableError } from '@/lib/cloudinary-accounts'

export type CloudinaryUsageMode = 'private' | 'shared-admin' | 'not-configured'

export interface CloudinaryUsageStatus {
  cloudinaryUsageMode: CloudinaryUsageMode
  adminSharedCloudinaryAvailable: boolean
  isUsingSharedCloudinary: boolean
}

const fallbackCloudinaryUsageStatus: CloudinaryUsageStatus = {
  cloudinaryUsageMode: 'not-configured',
  adminSharedCloudinaryAvailable: false,
  isUsingSharedCloudinary: false,
}

type CloudinarySettings = {
  userId?: string | null
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

async function hasEnabledCloudinaryAccountsForUser(userId?: string | null) {
  if (!userId) return false
  const count = await (prisma as any).cloudinaryAccount.count({
    where: { userId, enabled: true },
  }).catch((error: unknown) => {
    if (!isMissingCloudinaryAccountTableError(error)) {
      console.error('Cloudinary usage status account lookup failed:', error)
    }
    return 0
  })
  return count > 0
}

async function hasEnabledAdminCloudinaryAccounts() {
  const count = await (prisma as any).cloudinaryAccount.count({
    where: { user: { role: 'ADMIN' }, enabled: true },
  }).catch((error: unknown) => {
    if (!isMissingCloudinaryAccountTableError(error)) {
      console.error('Cloudinary usage status admin account lookup failed:', error)
    }
    return 0
  })
  return count > 0
}

export async function getCloudinaryUsageStatusForSettings(
  settings: CloudinarySettings | null | undefined,
  userRole?: string | null
): Promise<CloudinaryUsageStatus> {
  const hasOwnCloudinaryCredentials = hasCompleteCloudinaryCredentials(settings) ||
    await hasEnabledCloudinaryAccountsForUser(settings?.userId)
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
    }).catch((error) => {
      console.error('Cloudinary usage status admin settings lookup failed:', error)
      return null
    })
    const isSharedAllowed = adminSettings?.allowSharedCloudinary ?? true
    adminSharedCloudinaryAvailable = isSharedAllowed && (
      await hasEnabledAdminCloudinaryAccounts() ||
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
      userId: true,
    },
  }).catch((error) => {
    console.error('Cloudinary usage status user settings lookup failed:', error)
    return null
  })

  if (!settings && !hasCompleteEnvCloudinaryCredentials()) {
    return fallbackCloudinaryUsageStatus
  }

  return getCloudinaryUsageStatusForSettings(settings, userRole)
}
