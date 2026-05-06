import { writeFile, mkdir, readdir, unlink, stat } from 'fs/promises'
import { join, basename } from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface UploadedFile {
  path: string
  url: string
  size: number
}

// Base storage interface — swap implementations without changing callers
export interface StorageAdapter {
  save(localPath: string, contents: Buffer): Promise<string>
  read(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
  getUrl(path: string): string
}

// Local filesystem storage (development)
export class LocalStorage implements StorageAdapter {
  private baseDir: string

  constructor(baseDir = './storage') {
    this.baseDir = baseDir
  }

  async save(localPath: string, contents: Buffer): Promise<string> {
    const fullPath = join(this.baseDir, localPath)
    await mkdir(join(this.baseDir, basename(localPath, '.*')), { recursive: true })
    await writeFile(fullPath, contents)
    return fullPath
  }

  async read(path: string): Promise<Buffer> {
    // For local, path is absolute or relative to baseDir
    const fullPath = join(this.baseDir, path)
    return await (await import('fs')).promises.readFile(fullPath)
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.baseDir, path)
    await unlink(fullPath)
  }

  getUrl(path: string): string {
    // In dev, serve via Next.js static handler or direct file access
    return `/storage/${path}`
  }
}

// S3 storage adapter (production) — placeholder for future
export class S3Storage implements StorageAdapter {
  // Will implement with @aws-sdk/client-s3
  async save(_localPath: string, _contents: Buffer): Promise<string> {
    throw new Error('S3Storage not yet implemented')
  }
  async read(_path: string): Promise<Buffer> {
    throw new Error('S3Storage not yet implemented')
  }
  async delete(_path: string): Promise<void> {
    throw new Error('S3Storage not yet implemented')
  }
  getUrl(_path: string): string {
    throw new Error('S3Storage not yet implemented')
  }
}

// Factory
export function getStorage(): StorageAdapter {
  const type = process.env.STORAGE_TYPE || 'local'
  if (type === 's3') {
    return new S3Storage()
  }
  return new LocalStorage(process.env.STORAGE_LOCAL_PATH || './storage')
}
