import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCloudinaryCredentialsForUser, validateUserCloudinarySettings } from '@/lib/cloudinary-settings'
import { v2 as cloudinary } from 'cloudinary'

function normalizeCredential(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {}

  const submittedCredentials = {
    cloud_name: normalizeCredential(body.cloudinaryCloudName),
    api_key: normalizeCredential(body.cloudinaryApiKey),
    api_secret: normalizeCredential(body.cloudinaryApiSecret),
  }

  const submittedValues = Object.values(submittedCredentials)
  const hasSubmittedAnyCredential = submittedValues.some(Boolean)
  const hasSubmittedAllCredentials = submittedValues.every(Boolean)

  if (hasSubmittedAnyCredential && !hasSubmittedAllCredentials) {
    return NextResponse.json({ error: 'Vui lòng nhập đủ Cloud Name, API Key và API Secret trước khi test' }, { status: 400 })
  }

  let credentials = submittedCredentials
  if (!hasSubmittedAnyCredential) {
    const { isConfigured, missing } = await validateUserCloudinarySettings(session.user.id)
    if (!isConfigured) {
      return NextResponse.json(
        { error: `Cloudinary chưa được cấu hình. Thiếu: ${missing?.join(', ') || 'Cloudinary credentials'}` },
        { status: 400 }
      )
    }
    credentials = await getCloudinaryCredentialsForUser(session.user.id)
  }

  cloudinary.config({
    cloud_name: credentials.cloud_name,
    api_key: credentials.api_key,
    api_secret: credentials.api_secret,
  })

  try {
    await cloudinary.api.ping()
    return NextResponse.json({ success: true, message: 'Cloudinary kết nối thành công' })
  } catch (error) {
    console.error('Cloudinary test error:', error)
    return NextResponse.json({ error: 'Cloudinary test thất bại' }, { status: 400 })
  }
}
