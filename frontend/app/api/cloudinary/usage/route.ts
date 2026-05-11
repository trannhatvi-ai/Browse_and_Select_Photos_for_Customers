import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { v2 as cloudinary } from 'cloudinary'
import { authOptions } from '@/lib/auth'
import {
  buildCloudinaryUsagePayload,
  CLOUDINARY_FREE_LIMIT_BYTES,
  extractCloudinaryStorageUsage,
  getCloudinaryUsageErrorCode,
  isCloudinaryUsageNetworkError,
} from '@/lib/cloudinary-usage'
import { getUploadCloudinaryAccountsForUser } from '@/lib/cloudinary-accounts'
import { getCloudinaryUsageStatusForUser } from '@/lib/cloudinary-usage-status'
import { prisma } from '@/lib/db'

// GET /api/cloudinary/usage - prefer real Cloudinary Admin API numbers, fallback to DB estimate.
export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = sessionUser.role
  const usageStatus = await getCloudinaryUsageStatusForUser(sessionUser.id, role)
  const isSharedAdminUsage = usageStatus.cloudinaryUsageMode === 'shared-admin'
  const whereClause = role === 'ADMIN' || isSharedAdminUsage
    ? {}
    : { project: { createdBy: sessionUser.id } }

  const result = await prisma.photo.aggregate({
    where: whereClause,
    _sum: { size: true },
    _count: { id: true },
  })

  const totalPhotos = result._count.id || 0
  const fallbackUsedBytes = result._sum.size || 0

  const cloudinaryAccounts = await getUploadCloudinaryAccountsForUser(sessionUser.id)
  let poolUsedBytes = 0
  let poolLimitBytes = 0
  let poolUsageCount = 0

  for (const account of cloudinaryAccounts) {
    try {
      cloudinary.config(account)
      const cloudinaryUsage = await cloudinary.api.usage()
      const { usedBytes, limitBytes } = extractCloudinaryStorageUsage(cloudinaryUsage)
      poolUsedBytes += usedBytes
      poolLimitBytes += limitBytes
      poolUsageCount += 1

      if (account.id) {
        await (prisma as any).cloudinaryAccount.update({
          where: { id: account.id },
          data: {
            usedBytes: BigInt(Math.round(usedBytes)),
            limitBytes: BigInt(Math.round(limitBytes)),
            lastCheckedAt: new Date(),
          },
        })
      }
    } catch (error) {
      const code = getCloudinaryUsageErrorCode(error)
      if (isCloudinaryUsageNetworkError(error)) {
        console.warn(
          `Cloudinary usage API unavailable for ${account.cloudName} (${code ?? 'network error'}); using database estimate if pool usage is unavailable.`
        )
      } else {
        console.error(`Cloudinary usage API error for ${account.cloudName}:`, error)
      }
    }
  }

  if (poolUsageCount > 0) {
    return NextResponse.json(buildCloudinaryUsagePayload({
      usedBytes: poolUsedBytes,
      limitBytes: poolLimitBytes || CLOUDINARY_FREE_LIMIT_BYTES,
      totalPhotos,
      mode: usageStatus.cloudinaryUsageMode,
      source: 'cloudinary',
    }))
  }

  return NextResponse.json(buildCloudinaryUsagePayload({
    usedBytes: fallbackUsedBytes,
    limitBytes: CLOUDINARY_FREE_LIMIT_BYTES,
    totalPhotos,
    mode: usageStatus.cloudinaryUsageMode,
    source: 'database-estimate',
  }))
}
