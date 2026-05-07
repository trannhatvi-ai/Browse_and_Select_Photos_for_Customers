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

  // Nếu user đã cấu hình riêng, dùng cấu hình đó
  if (settings?.cloudinaryCloudName && settings?.cloudinaryApiKey && settings?.cloudinaryApiSecret) {
    return {
      cloud_name: settings.cloudinaryCloudName,
      api_key: settings.cloudinaryApiKey,
      api_secret: settings.cloudinaryApiSecret,
    }
  }

  // Nếu không có cấu hình riêng, mặc định dùng của Admin (env vars)
  // Lưu ý: getCloudinaryCredentialsForUser luôn fallback về Admin để đảm bảo các project cũ vẫn hoạt động
  return {
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
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

// Kiểm tra xem user có quyền dùng Cloudinary để tạo mới/upload hay không
export async function validateUserCloudinarySettings(userId: string): Promise<{ isConfigured: boolean; missing?: string[] }> {
  // 1. Kiểm tra xem user có cấu hình riêng không
  const settings = await prisma.settings.findUnique({
    where: { userId },
    select: {
      cloudinaryCloudName: true,
      cloudinaryApiKey: true,
      cloudinaryApiSecret: true,
    },
  })

  const hasOwnConfig = !!(settings?.cloudinaryCloudName && settings?.cloudinaryApiKey && settings?.cloudinaryApiSecret)
  if (hasOwnConfig) return { isConfigured: true }

  // 2. Nếu không có cấu hình riêng, kiểm tra xem Admin có cho phép dùng chung không
  const adminSettings = await prisma.settings.findFirst({
    where: { user: { role: 'ADMIN' } },
    select: { allowSharedCloudinary: true }
  })

  const isSharedAllowed = adminSettings?.allowSharedCloudinary ?? true // Mặc định là cho phép nếu chưa cấu hình

  if (isSharedAllowed) {
    // Nếu cho phép dùng chung, kiểm tra xem Admin đã cấu hình trong env chưa
    const hasAdminEnv = !!(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
    return { isConfigured: hasAdminEnv }
  }

  // 3. Nếu không cho phép dùng chung và user chưa có cấu hình riêng
  const missing: string[] = []
  if (!settings?.cloudinaryCloudName) missing.push('Cloud Name')
  if (!settings?.cloudinaryApiKey) missing.push('API Key')
  if (!settings?.cloudinaryApiSecret) missing.push('API Secret')

  return {
    isConfigured: false,
    missing: missing.length > 0 ? missing : ['Cần cấu hình Cloudinary riêng']
  }
}