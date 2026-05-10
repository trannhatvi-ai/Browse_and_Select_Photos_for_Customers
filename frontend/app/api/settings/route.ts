import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeAdminIntegrationConfig } from '@/lib/notifications'

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let settings = await prisma.settings.findUnique({
    where: { userId: sessionUser.id }
  })

  if (!settings) {
    settings = await prisma.settings.create({
      data: { userId: sessionUser.id, studioName: 'STUDIO' }
    })
  }

  const payload: any = {
    ...settings,
    userRole: sessionUser.role
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
    studioName, phone, email, 
    cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret, 
    allowSharedCloudinary, watermarkText, watermarkOpacity,
    vlmProvider, vlmApiKey, vlmApiBase, vlmModelId,
    adminIntegrationConfig
  } = body

  const settingsData: any = {
    studioName,
    phone,
    email,
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
