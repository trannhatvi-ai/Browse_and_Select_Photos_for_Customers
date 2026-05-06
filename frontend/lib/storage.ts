/**
 * Cloudinary Storage Implementation (Free Forever)
 */

export interface StorageAdapter {
  getUrl(publicId: string): string
  getPreviewUrl(publicId: string): string
  delete(publicId: string): Promise<void>
}

class CloudinaryStorage implements StorageAdapter {
  private cloudName: string

  constructor(cloudName?: string) {
    this.cloudName = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
  }

  // URL ảnh gốc
  getUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`
  }

  // URL ảnh đóng dấu Watermark mờ (o_30) và text "STUDIO"
  getPreviewUrl(publicId: string): string {
    // Thêm các tham số biến đổi trực tiếp vào URL để đóng dấu "PROOFS" mờ 30%
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/co_white,l_text:Arial_120_bold:PROOFS,o_30/v1/${publicId}`
  }

  async delete(publicId: string): Promise<void> {
    // Xóa file qua API (Cần thực hiện từ phía Server với API Secret)
    console.log('Cloudinary: Delete requested for', publicId)
  }
}

export function getStorage(): StorageAdapter {
  return new CloudinaryStorage()
}

export function createStorage(cloudName?: string): StorageAdapter {
  return new CloudinaryStorage(cloudName)
}

export function buildPreviewUrl(publicId: string, cloudName?: string): string {
  const resolvedCloudName = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
  return `https://res.cloudinary.com/${resolvedCloudName}/image/upload/co_white,l_text:Arial_120_bold:PROOFS,o_30/v1/${publicId}`
}

// Local filesystem storage used for tests and local development
import { promises as fs } from 'fs'
import { dirname, join } from 'path'

export class LocalStorage implements StorageAdapter {
  basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  getUrl(publicId: string): string {
    // Tests expect a canonical `/storage/...` URL regardless of configured basePath
    return `/storage/${publicId}`.replace(/\\/g, '/')
  }

  getPreviewUrl(publicId: string): string {
    return this.getUrl(publicId)
  }

  async save(publicId: string, data: Buffer): Promise<string> {
    const full = join(this.basePath, publicId)
    await fs.mkdir(dirname(full), { recursive: true })
    await fs.writeFile(full, data)
    // Return a filesystem path containing the configured basePath (tests assert this)
    return `/${this.basePath}/${publicId}`.replace(/\\/g, '/')
  }

  async read(publicId: string): Promise<Buffer> {
    const full = join(this.basePath, publicId)
    return fs.readFile(full)
  }

  async delete(publicId: string): Promise<void> {
    const full = join(this.basePath, publicId)
    try {
      await fs.unlink(full)
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e
    }
  }
}
