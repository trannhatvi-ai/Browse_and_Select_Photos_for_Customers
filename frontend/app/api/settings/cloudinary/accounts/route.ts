import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CLOUDINARY_FREE_LIMIT_BYTES, normalizeCloudinaryLimitBytes } from '@/lib/cloudinary-usage'
import { isMissingCloudinaryAccountTableError } from '@/lib/cloudinary-accounts'

function sanitizeAccount(account: any) {
  return {
    id: account.id,
    label: account.label,
    cloudName: account.cloudName,
    apiKey: account.apiKey,
    hasApiSecret: Boolean(account.apiSecret),
    enabled: account.enabled,
    usedBytes: Number(account.usedBytes || 0),
    limitBytes: normalizeCloudinaryLimitBytes(Number(account.limitBytes || CLOUDINARY_FREE_LIMIT_BYTES)),
    lastCheckedAt: account.lastCheckedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function migrationRequiredResponse() {
  return NextResponse.json(
    {
      error: 'Cloudinary account pool has not been migrated yet.',
      migrationRequired: true,
    },
    { status: 409 }
  )
}

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  return session?.user as any
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await (prisma as any).cloudinaryAccount.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: 'asc' },
  }).catch((error: unknown) => {
    if (isMissingCloudinaryAccountTableError(error)) return []
    throw error
  })

  return NextResponse.json({ accounts: accounts.map(sanitizeAccount) })
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const cloudName = clean(body.cloudName ?? body.cloudinaryCloudName)
  const apiKey = clean(body.apiKey ?? body.cloudinaryApiKey)
  const apiSecret = clean(body.apiSecret ?? body.cloudinaryApiSecret)
  const label = clean(body.label) || cloudName

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Missing Cloudinary credentials' },
      { status: 400 }
    )
  }

  const account = await (prisma as any).cloudinaryAccount.create({
    data: {
      userId: sessionUser.id,
      label,
      cloudName,
      apiKey,
      apiSecret,
      enabled: true,
      limitBytes: BigInt(CLOUDINARY_FREE_LIMIT_BYTES),
    },
  }).catch((error: unknown) => {
    if (isMissingCloudinaryAccountTableError(error)) return null
    throw error
  })
  if (!account) return migrationRequiredResponse()

  return NextResponse.json({ account: sanitizeAccount(account) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const id = clean(body.id)
  if (!id) {
    return NextResponse.json({ error: 'Missing account id' }, { status: 400 })
  }

  const data: any = {}
  if (body.label !== undefined) data.label = clean(body.label)
  if (body.cloudName !== undefined || body.cloudinaryCloudName !== undefined) {
    data.cloudName = clean(body.cloudName ?? body.cloudinaryCloudName)
  }
  if (body.apiKey !== undefined || body.cloudinaryApiKey !== undefined) {
    data.apiKey = clean(body.apiKey ?? body.cloudinaryApiKey)
  }
  if (body.apiSecret !== undefined || body.cloudinaryApiSecret !== undefined) {
    const apiSecret = clean(body.apiSecret ?? body.cloudinaryApiSecret)
    if (apiSecret) data.apiSecret = apiSecret
  }
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled

  const updateResult = await (prisma as any).cloudinaryAccount.updateMany({
    where: { id, userId: sessionUser.id },
    data,
  }).catch((error: unknown) => {
    if (isMissingCloudinaryAccountTableError(error)) return null
    throw error
  })
  if (!updateResult) return migrationRequiredResponse()

  const account = await (prisma as any).cloudinaryAccount.findFirst({
    where: { id, userId: sessionUser.id },
  }).catch((error: unknown) => {
    if (isMissingCloudinaryAccountTableError(error)) return null
    throw error
  })
  if (!account) {
    return NextResponse.json({ error: 'Cloudinary account not found' }, { status: 404 })
  }

  return NextResponse.json({ account: sanitizeAccount(account) })
}

export async function DELETE(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const id = clean(body.id)
  if (!id) {
    return NextResponse.json({ error: 'Missing account id' }, { status: 400 })
  }

  const deleteResult = await (prisma as any).cloudinaryAccount.deleteMany({
    where: { id, userId: sessionUser.id },
  }).catch((error: unknown) => {
    if (isMissingCloudinaryAccountTableError(error)) return null
    throw error
  })
  if (!deleteResult) return migrationRequiredResponse()

  return NextResponse.json({ success: true })
}
