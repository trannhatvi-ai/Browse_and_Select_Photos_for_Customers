import { prisma } from '@/lib/db'
import { isMissingCloudinaryAccountTableError, selectBestCloudinaryAccount } from '@/lib/cloudinary-accounts'

export interface CloudinaryCredentials {
  cloud_name: string
  api_key: string
  api_secret: string
}

type CloudinarySettingsRecord = {
  cloudinaryCloudName?: string | null
  cloudinaryApiKey?: string | null
  cloudinaryApiSecret?: string | null
}

function normalizeCredential(value?: string | null) {
  return value?.trim() || ''
}

function credentialsFromSettings(settings?: CloudinarySettingsRecord | null): CloudinaryCredentials | null {
  const cloud_name = normalizeCredential(settings?.cloudinaryCloudName)
  const api_key = normalizeCredential(settings?.cloudinaryApiKey)
  const api_secret = normalizeCredential(settings?.cloudinaryApiSecret)

  if (!cloud_name || !api_key || !api_secret) return null

  return { cloud_name, api_key, api_secret }
}

function credentialsFromEnv(): CloudinaryCredentials | null {
  const cloud_name = normalizeCredential(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
  const api_key = normalizeCredential(process.env.CLOUDINARY_API_KEY)
  const api_secret = normalizeCredential(process.env.CLOUDINARY_API_SECRET)

  if (!cloud_name || !api_key || !api_secret) return null

  return { cloud_name, api_key, api_secret }
}

function missingCredentials(settings?: CloudinarySettingsRecord | null) {
  const missing: string[] = []
  if (!normalizeCredential(settings?.cloudinaryCloudName)) missing.push('Cloud Name')
  if (!normalizeCredential(settings?.cloudinaryApiKey)) missing.push('API Key')
  if (!normalizeCredential(settings?.cloudinaryApiSecret)) missing.push('API Secret')
  return missing
}

async function getAdminCloudinarySettings() {
  return prisma.settings.findFirst({
    where: { user: { role: 'ADMIN' } },
    select: {
      userId: true,
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
      allowSharedCloudinary: true,
    },
  })
}

async function getAdminCloudinaryCredentials() {
  const adminSettings = await getAdminCloudinarySettings()
  return credentialsFromSettings(adminSettings) || credentialsFromEnv()
}

async function getEnabledCloudinaryAccountCountForUser(userId: string) {
  return (prisma as any).cloudinaryAccount.count({
    where: { userId, enabled: true },
  }).catch((error: unknown) => {
    if (!isMissingCloudinaryAccountTableError(error)) {
      console.error('Cloudinary account count failed:', error)
    }
    return 0
  })
}

async function getEnabledAdminCloudinaryAccounts() {
  return (prisma as any).cloudinaryAccount.findMany({
    where: { user: { role: 'ADMIN' }, enabled: true },
    orderBy: { createdAt: 'asc' },
  }).catch((error: unknown) => {
    if (!isMissingCloudinaryAccountTableError(error)) {
      console.error('Admin Cloudinary account lookup failed:', error)
    }
    return []
  })
}

async function getBestPoolCredentialsForUser(userId: string): Promise<CloudinaryCredentials | null> {
  const account = selectBestCloudinaryAccount(await (prisma as any).cloudinaryAccount.findMany({
    where: { userId, enabled: true },
    orderBy: { createdAt: 'asc' },
  }).catch((error: unknown) => {
    if (!isMissingCloudinaryAccountTableError(error)) {
      console.error('Cloudinary account lookup failed:', error)
    }
    return []
  }))

  return account
    ? { cloud_name: account.cloud_name, api_key: account.api_key, api_secret: account.api_secret }
    : null
}

async function getBestAdminPoolCredentials(): Promise<CloudinaryCredentials | null> {
  const account = selectBestCloudinaryAccount(await getEnabledAdminCloudinaryAccounts())

  return account
    ? { cloud_name: account.cloud_name, api_key: account.api_key, api_secret: account.api_secret }
    : null
}

export async function getCloudinaryCredentialsForUser(userId: string): Promise<CloudinaryCredentials> {
  const ownPoolCredentials = await getBestPoolCredentialsForUser(userId)
  if (ownPoolCredentials) return ownPoolCredentials

  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  // Nếu user đã cấu hình riêng, dùng cấu hình đó
  const ownCredentials = credentialsFromSettings(settings)
  if (ownCredentials) return ownCredentials

  // Nếu không có cấu hình riêng, mặc định dùng của Admin
  // Lưu ý: getCloudinaryCredentialsForUser luôn fallback về Admin để đảm bảo các project cũ vẫn hoạt động
  const adminCredentials = await getBestAdminPoolCredentials() || await getAdminCloudinaryCredentials()
  return adminCredentials || { cloud_name: '', api_key: '', api_secret: '' }
}

export async function getCloudinaryCredentialsForProject(projectId: string): Promise<CloudinaryCredentials> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  return getCloudinaryCredentialsForUser(project.createdBy)
}

// Kiểm tra Cloudinary cho show đã tồn tại. Show cũ vẫn được dùng cấu hình Admin
// dù Admin đã tắt quyền dùng chung cho các show mới.
export async function validateExistingProjectCloudinarySettings(userId: string): Promise<{ isConfigured: boolean; missing?: string[] }> {
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  if (credentialsFromSettings(settings)) return { isConfigured: true }
  if (await getEnabledCloudinaryAccountCountForUser(userId)) return { isConfigured: true }
  if (await getEnabledCloudinaryAccountCountForUser(userId)) return { isConfigured: true }
  if ((await getEnabledAdminCloudinaryAccounts()).length > 0) return { isConfigured: true }
  if (await getAdminCloudinaryCredentials()) return { isConfigured: true }

  const missing = missingCredentials(settings)
  return {
    isConfigured: false,
    missing: missing.length > 0 ? missing : ['Cần cấu hình Cloudinary riêng']
  }
}

// Kiểm tra xem user có quyền dùng Cloudinary để tạo mới/upload hay không
export async function validateUserCloudinarySettings(userId: string): Promise<{ isConfigured: boolean; missing?: string[] }> {
  // 1. Kiểm tra xem user có cấu hình riêng không
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
      user: {
        select: { role: true },
      },
    },
  })

  if (credentialsFromSettings(settings)) return { isConfigured: true }

  const user = settings?.user ?? await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role === 'ADMIN') {
    return { isConfigured: !!(await getBestAdminPoolCredentials() || await getAdminCloudinaryCredentials()) }
  }

  // 2. Nếu không có cấu hình riêng, kiểm tra xem Admin có cho phép dùng chung không
  const adminSettings = await getAdminCloudinarySettings()

  const isSharedAllowed = adminSettings?.allowSharedCloudinary ?? true // Mặc định là cho phép nếu chưa cấu hình

  if (isSharedAllowed) {
    // Nếu cho phép dùng chung, kiểm tra xem Admin đã cấu hình trong settings hoặc env chưa
    return { isConfigured: !!((await getEnabledAdminCloudinaryAccounts()).length > 0 || credentialsFromSettings(adminSettings) || credentialsFromEnv()) }
  }

  // 3. Nếu không cho phép dùng chung và user chưa có cấu hình riêng
  const missing = missingCredentials(settings)

  return {
    isConfigured: false,
    missing: missing.length > 0 ? missing : ['Cần cấu hình Cloudinary riêng']
  }
}
