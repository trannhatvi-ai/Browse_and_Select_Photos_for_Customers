import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let settings = await prisma.settings.findUnique({
    where: { userId: session.user.id }
  })

  if (!settings) {
    settings = await prisma.settings.create({
      data: { userId: session.user.id, studioName: 'STUDIO' }
    })
  }

  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { studioName, phone, email, cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret, watermarkText, watermarkOpacity } = body

  const settings = await prisma.settings.upsert({
    where: { userId: session.user.id },
    update: {
      studioName,
      phone,
      email,
      cloudinaryCloudName,
      cloudinaryApiKey,
      cloudinaryApiSecret,
      watermarkText,
      watermarkOpacity: parseInt(watermarkOpacity) || 30
    },
    create: {
      userId: session.user.id,
      studioName,
      phone,
      email,
      cloudinaryCloudName,
      cloudinaryApiKey,
      cloudinaryApiSecret,
      watermarkText,
      watermarkOpacity: parseInt(watermarkOpacity) || 30
    }
  })

  return NextResponse.json(settings)
}
