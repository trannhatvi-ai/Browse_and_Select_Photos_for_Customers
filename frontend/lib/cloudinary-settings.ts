import { prisma } from '@/lib/db'

export interface CloudinaryCredentials {
  cloud_name: string
  api_key: string
  api_secret: string
}

export async function getCloudinaryCredentialsForUser(userId: string): Promise<CloudinaryCredentials> {
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  return {
    cloud_name: settings?.cloudinaryCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: settings?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY || '',
    api_secret: settings?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET || '',
  }
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

// Kiểm tra xem user đã cấu hình Cloudinary hay chưa (không dùng fallback env)
export async function validateUserCloudinarySettings(userId: string): Promise<{ isConfigured: boolean; missing?: string[] }> {
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  const missing: string[] = []
  
  if (!settings?.cloudinaryCloudName) missing.push('Cloud Name')
  if (!settings?.cloudinaryApiKey) missing.push('API Key')
  if (!settings?.cloudinaryApiSecret) missing.push('API Secret')

  return {
    isConfigured: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined
  }
}