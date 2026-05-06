import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'

describe('Database Connection', () => {
  it('should connect to database', async () => {
    // Ping database
    await prisma.$connect()
    expect(prisma).toBeDefined()
  })

  it('should be able to query users (empty)', async () => {
    const count = await prisma.user.count()
    expect(typeof count).toBe('number')
  })
})
