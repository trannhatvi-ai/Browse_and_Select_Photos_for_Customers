import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCloudinaryUsageStatusForSettings } from '@/lib/cloudinary-usage-status'
import { normalizeAdminIntegrationConfig } from '@/lib/notifications'
import { formatVietnamPhoneForDisplay, normalizeVietnamPhone } from '@/lib/phone-format'
import { getPhoneLookupCandidates, normalizeEmail } from '@/lib/auth-verification'

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      email: true,
      phone: true,
      name: true,
      username: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
    },
  })

  let settings = await prisma.settings.findUnique({
    where: { userId: sessionUser.id }
  })

  if (!settings) {
    const fallbackStudioName = user?.name || user?.username || 'STUDIO'
    settings = await prisma.settings.create({
      data: {
        userId: sessionUser.id,
        studioName: fallbackStudioName,
        email: user?.email || '',
        phone: user?.phone || '',
      }
    })
  }

  const fallbackStudioName = user?.name || user?.username || 'STUDIO'

  const cloudinaryUsage = await getCloudinaryUsageStatusForSettings(settings, sessionUser.role)

  const payload: any = {
    ...settings,
    email: settings.email || user?.email || '',
    phone: formatVietnamPhoneForDisplay(settings.phone || user?.phone || ''),
    studioName: settings.studioName || fallbackStudioName,
    profileName: user?.name || '',
    profileUsername: user?.username || '',
    userRole: sessionUser.role,
    ...cloudinaryUsage,
    emailVerified: Boolean(user?.emailVerifiedAt),
    phoneVerified: Boolean(user?.phoneVerifiedAt),
  }

  if (sessionUser.role === 'ADMIN') {
    payload.adminIntegrationConfig = normalizeAdminIntegrationConfig(settings.adminIntegrationConfig)
  }

  return NextResponse.json(payload)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { 
    studioName, phone, email, name, username,
    cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret, 
    allowSharedCloudinary, watermarkText, watermarkOpacity,
    vlmProvider, vlmApiKey, vlmApiBase, vlmModelId,
    adminIntegrationConfig
  } = body

  const normalizedPhone = phone ? normalizeVietnamPhone(phone) : ''
  if (phone && !normalizedPhone) {
    return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 })
  }

  const normalizedEmail = typeof email === 'string' && email.trim() ? normalizeEmail(email) : ''
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  const normalizedName = typeof name === 'string' ? name.trim() : ''

  if (email && !normalizedEmail) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
  }

  const userUpdates: Record<string, string> = {}
  if (normalizedName) userUpdates.name = normalizedName
  if (normalizedUsername) userUpdates.username = normalizedUsername
  if (normalizedEmail) userUpdates.email = normalizedEmail
  if (normalizedPhone) userUpdates.phone = normalizedPhone

  if (Object.keys(userUpdates).length > 0) {
    const currentUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        phone: true,
      },
    })

    const existing = await prisma.user.findFirst({
      where: {
        id: { not: sessionUser.id },
        OR: [
          normalizedEmail ? { email: normalizedEmail } : undefined,
          normalizedUsername ? { username: normalizedUsername } : undefined,
          normalizedPhone ? { phone: { in: getPhoneLookupCandidates(normalizedPhone) } } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email, username hoặc số điện thoại đã tồn tại' },
        { status: 409 }
      )
    }

    const userData: Record<string, string | Date | null> = { ...userUpdates }
    if (normalizedEmail && normalizedEmail !== currentUser?.email) {
      userData.emailVerifiedAt = null
      userData.emailVerificationCodeHash = null
      userData.emailVerificationExpires = null
    }
    if (normalizedPhone && normalizedPhone !== currentUser?.phone) {
      userData.phoneVerifiedAt = null
      userData.phoneVerificationCodeHash = null
      userData.phoneVerificationExpires = null
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: userData,
    })
  }

  const settingsData: any = {
    studioName,
    phone: normalizedPhone || undefined,
    email: normalizedEmail || undefined,
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
    watermarkText,
    watermarkOpacity: parseInt(watermarkOpacity) || 30,
    vlmProvider,
    vlmApiKey,
    vlmApiBase,
    vlmModelId
  }

  if (sessionUser.role === 'ADMIN' && typeof allowSharedCloudinary === 'boolean') {
    settingsData.allowSharedCloudinary = allowSharedCloudinary
  }

  if (sessionUser.role === 'ADMIN' && adminIntegrationConfig) {
    settingsData.adminIntegrationConfig = normalizeAdminIntegrationConfig(adminIntegrationConfig)
  }

  const settings = await prisma.settings.upsert({
    where: { userId: sessionUser.id },
    update: settingsData,
    create: {
      userId: sessionUser.id,
      ...settingsData
    }
  })

  return NextResponse.json(settings)
}
