import { prisma } from '@/lib/db'
import type { CloudinaryCredentials } from '@/lib/cloudinary-settings'
import { normalizeCloudinaryLimitBytes } from '@/lib/cloudinary-usage'

export const CLOUDINARY_ACCOUNT_FREE_LIMIT_BYTES = BigInt(25 * 1024 * 1024 * 1024)

export type CloudinaryAccountRecord = {
  id: string
  userId: string
  label: string
  cloudName: string
  apiKey: string
  apiSecret: string
  enabled: boolean
  usedBytes?: bigint | number | null
  limitBytes?: bigint | number | null
  lastCheckedAt?: Date | string | null
}

export type ResolvedCloudinaryAccount = CloudinaryCredentials & {
  id: string | null
  userId: string | null
  label: string
  cloudName: string
  usedBytes: bigint
  limitBytes: bigint
  source: 'pool' | 'legacy-settings' | 'env'
}

type LegacySettingsRecord = {
  userId?: string | null
  cloudinaryCloudName?: string | null
  cloudinaryApiKey?: string | null
  cloudinaryApiSecret?: string | null
  allowSharedCloudinary?: boolean | null
}

type PhotoCloudinaryFields = {
  originalUrl?: string | null
  previewUrl?: string | null
  cloudinaryAccountId?: string | null
  cloudinaryCloudName?: string | null
}

function normalizeCredential(value?: string | null) {
  return value?.trim() || ''
}

export function isMissingCloudinaryAccountTableError(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error as { code?: unknown }).code === 'P2021'
  )
}

function logCloudinaryAccountLookupError(error: unknown) {
  if (isMissingCloudinaryAccountTableError(error)) return
  console.error('Cloudinary account lookup failed:', error)
}

function toBigInt(value: bigint | number | null | undefined, fallback: bigint) {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.max(0, Math.floor(value)))
  return fallback
}

function toLimitBigInt(value: bigint | number | null | undefined) {
  if (typeof value === 'bigint') {
    if (value > BigInt(0) && value < BigInt(1024 * 1024)) return CLOUDINARY_ACCOUNT_FREE_LIMIT_BYTES
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.round(normalizeCloudinaryLimitBytes(value)))
  }
  return CLOUDINARY_ACCOUNT_FREE_LIMIT_BYTES
}

function toResolvedAccount(account: CloudinaryAccountRecord): ResolvedCloudinaryAccount | null {
  const cloudName = normalizeCredential(account.cloudName)
  const apiKey = normalizeCredential(account.apiKey)
  const apiSecret = normalizeCredential(account.apiSecret)
  if (!account.enabled || !cloudName || !apiKey || !apiSecret) return null

  return {
    id: account.id,
    userId: account.userId,
    label: account.label || cloudName,
    cloudName,
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    usedBytes: toBigInt(account.usedBytes, BigInt(0)),
    limitBytes: toLimitBigInt(account.limitBytes),
    source: 'pool',
  }
}

function legacySettingsToAccount(settings?: LegacySettingsRecord | null): ResolvedCloudinaryAccount | null {
  const cloudName = normalizeCredential(settings?.cloudinaryCloudName)
  const apiKey = normalizeCredential(settings?.cloudinaryApiKey)
  const apiSecret = normalizeCredential(settings?.cloudinaryApiSecret)
  if (!cloudName || !apiKey || !apiSecret) return null

  return {
    id: null,
    userId: settings?.userId || null,
    label: cloudName,
    cloudName,
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    usedBytes: BigInt(0),
    limitBytes: CLOUDINARY_ACCOUNT_FREE_LIMIT_BYTES,
    source: 'legacy-settings',
  }
}

function envToAccount(): ResolvedCloudinaryAccount | null {
  const cloudName = normalizeCredential(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
  const apiKey = normalizeCredential(process.env.CLOUDINARY_API_KEY)
  const apiSecret = normalizeCredential(process.env.CLOUDINARY_API_SECRET)
  if (!cloudName || !apiKey || !apiSecret) return null

  return {
    id: null,
    userId: null,
    label: cloudName,
    cloudName,
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    usedBytes: BigInt(0),
    limitBytes: CLOUDINARY_ACCOUNT_FREE_LIMIT_BYTES,
    source: 'env',
  }
}

function remainingBytes(account: ResolvedCloudinaryAccount) {
  return account.limitBytes - account.usedBytes
}

export function selectBestCloudinaryAccount(accounts: CloudinaryAccountRecord[]) {
  const resolved = accounts
    .map(toResolvedAccount)
    .filter((account): account is ResolvedCloudinaryAccount => Boolean(account))

  resolved.sort((a, b) => {
    const remainingA = remainingBytes(a)
    const remainingB = remainingBytes(b)
    if (remainingA === remainingB) return a.label.localeCompare(b.label)
    return remainingA > remainingB ? -1 : 1
  })

  return resolved[0] ?? null
}

async function getEnabledPoolAccountsForUser(userId: string) {
  const rows = await (prisma as any).cloudinaryAccount.findMany({
    where: { userId, enabled: true },
    orderBy: { createdAt: 'asc' },
  }).catch((error: unknown) => {
    logCloudinaryAccountLookupError(error)
    return []
  })

  return (rows as CloudinaryAccountRecord[])
    .map(toResolvedAccount)
    .filter((account): account is ResolvedCloudinaryAccount => Boolean(account))
}

async function getLegacySettingsAccountForUser(userId: string) {
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      userId: true,
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  return legacySettingsToAccount(settings)
}

async function getAdminSettings() {
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

async function getAdminPoolAccounts() {
  const rows = await (prisma as any).cloudinaryAccount.findMany({
    where: { user: { role: 'ADMIN' }, enabled: true },
    orderBy: { createdAt: 'asc' },
  }).catch((error: unknown) => {
    logCloudinaryAccountLookupError(error)
    return []
  })

  return (rows as CloudinaryAccountRecord[])
    .map(toResolvedAccount)
    .filter((account): account is ResolvedCloudinaryAccount => Boolean(account))
}

function selectBestResolvedAccount(accounts: ResolvedCloudinaryAccount[]) {
  return sortResolvedAccounts(accounts)[0] ?? null
}

function sortResolvedAccounts(accounts: ResolvedCloudinaryAccount[]) {
  return [...accounts].sort((a, b) => {
    const remainingA = remainingBytes(a)
    const remainingB = remainingBytes(b)
    if (remainingA === remainingB) return a.label.localeCompare(b.label)
    return remainingA > remainingB ? -1 : 1
  })
}

export async function getUploadCloudinaryAccountsForUser(userId: string): Promise<ResolvedCloudinaryAccount[]> {
  const privateAccounts = await getEnabledPoolAccountsForUser(userId)
  if (privateAccounts.length > 0) return sortResolvedAccounts(privateAccounts)

  const legacyPrivateAccount = await getLegacySettingsAccountForUser(userId)
  if (legacyPrivateAccount) return [legacyPrivateAccount]

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (user?.role === 'ADMIN') {
    const envAccount = envToAccount()
    return envAccount ? [envAccount] : []
  }

  const adminSettings = await getAdminSettings()
  const isSharedAllowed = adminSettings?.allowSharedCloudinary ?? true
  if (!isSharedAllowed) return []

  const adminPool = await getAdminPoolAccounts()
  if (adminPool.length > 0) return sortResolvedAccounts(adminPool)

  const fallback = legacySettingsToAccount(adminSettings) || envToAccount()
  return fallback ? [fallback] : []
}

export async function getUploadCloudinaryAccountForUser(userId: string): Promise<ResolvedCloudinaryAccount | null> {
  return selectBestResolvedAccount(await getUploadCloudinaryAccountsForUser(userId))
}

export async function getUploadCloudinaryAccountsForProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  })

  if (!project) throw new Error('Project not found')
  return getUploadCloudinaryAccountsForUser(project.createdBy)
}

export async function getUploadCloudinaryAccountForProject(projectId: string) {
  return selectBestResolvedAccount(await getUploadCloudinaryAccountsForProject(projectId))
}

export function extractCloudNameFromUrl(url?: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'res.cloudinary.com') return null
    const firstPathPart = parsed.pathname.split('/').filter(Boolean)[0]
    return firstPathPart || null
  } catch {
    return null
  }
}

async function findAccountByCloudName(userId: string, cloudName: string) {
  const privateAccounts = await getEnabledPoolAccountsForUser(userId)
  const privateMatch = privateAccounts.find((account) => account.cloudName === cloudName)
  if (privateMatch) return privateMatch

  const legacyPrivate = await getLegacySettingsAccountForUser(userId)
  if (legacyPrivate?.cloudName === cloudName) return legacyPrivate

  const adminAccounts = await getAdminPoolAccounts()
  const adminMatch = adminAccounts.find((account) => account.cloudName === cloudName)
  if (adminMatch) return adminMatch

  const adminLegacy = legacySettingsToAccount(await getAdminSettings())
  if (adminLegacy?.cloudName === cloudName) return adminLegacy

  const envAccount = envToAccount()
  if (envAccount?.cloudName === cloudName) return envAccount

  return null
}

export async function resolveCloudinaryAccountForPhoto(
  projectOwnerUserId: string,
  photo: PhotoCloudinaryFields
): Promise<ResolvedCloudinaryAccount | null> {
  if (photo.cloudinaryAccountId) {
    const account = await (prisma as any).cloudinaryAccount.findUnique({
      where: { id: photo.cloudinaryAccountId },
    }).catch((error: unknown) => {
      logCloudinaryAccountLookupError(error)
      return null
    })
    const resolved = account ? toResolvedAccount(account as CloudinaryAccountRecord) : null
    if (resolved) return resolved
  }

  const cloudName = photo.cloudinaryCloudName || extractCloudNameFromUrl(photo.previewUrl)
  if (cloudName) return findAccountByCloudName(projectOwnerUserId, cloudName)

  return getUploadCloudinaryAccountForUser(projectOwnerUserId)
}
