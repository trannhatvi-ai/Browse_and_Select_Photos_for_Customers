import { LocalStorage } from '@/lib/storage'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

describe('LocalStorage', () => {
  const storage = new LocalStorage('./test-storage')
  const testPath = 'test/file.txt'
  const contents = Buffer.from('hello world')

  beforeAll(async () => {
    await mkdir(join('./test-storage', 'test'), { recursive: true })
  })

  afterAll(async () => {
    // Cleanup
    await storage.delete(testPath)
  })

  it('should save and read file', async () => {
    const url = await storage.save(testPath, contents)
    expect(url).toContain('test-storage')
    const data = await storage.read(testPath)
    expect(data.toString()).toBe('hello world')
  })

  it('should delete file', async () => {
    await storage.save(testPath, contents)
    await storage.delete(testPath)
    // Reading deleted file should throw
    await expect(storage.read(testPath)).rejects.toThrow()
  })

  it('should generate correct URL', () => {
    const url = storage.getUrl('some/path.jpg')
    expect(url).toBe('/storage/some/path.jpg')
  })
})
