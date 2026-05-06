import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v2 as cloudinary } from 'cloudinary'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.settings.findUnique({
    where: { userId: session.user.id },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  const cloudName = settings?.cloudinaryCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = settings?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY
  const apiSecret = settings?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Vui lòng nhập đủ cloud name, api key và api secret' }, { status: 400 })
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  try {
    await cloudinary.api.ping()
    return NextResponse.json({ success: true, message: 'Cloudinary kết nối thành công' })
  } catch (error) {
    console.error('Cloudinary test error:', error)
    return NextResponse.json({ error: 'Cloudinary test thất bại' }, { status: 400 })
  }
}
