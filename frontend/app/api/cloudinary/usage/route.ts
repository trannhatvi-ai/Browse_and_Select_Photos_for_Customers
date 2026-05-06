import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const FREE_LIMIT = 25 * 1024 * 1024 * 1024 // 25 GB Cloudinary free tier

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// GET /api/cloudinary/usage — tính dung lượng từ Database
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user as any)?.role

  const whereClause = role === 'ADMIN' ? {} : {
    project: { createdBy: session.user.id }
  }

  const result = await prisma.photo.aggregate({
    where: whereClause,
    _sum: { size: true },
    _count: { id: true },
  })

  const usedBytes = result._sum.size || 0
  const totalPhotos = result._count.id || 0

  return NextResponse.json({
    used: usedBytes,
    limit: FREE_LIMIT,
    usedFormatted: formatBytes(usedBytes),
    limitFormatted: formatBytes(FREE_LIMIT),
    percentage: Math.round((usedBytes / FREE_LIMIT) * 100),
    totalPhotos,
  })
}
