const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('0919562182qQ@', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      username: 'admin',
      phone: '0900000000',
      authProvider: 'credentials',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
    create: {
      email: 'admin',
      name: 'HTECH Admin',
      username: 'admin',
      phone: '0900000000',
      password: hashedPassword,
      role: 'ADMIN',
      authProvider: 'credentials',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    }
  })

  console.log('Admin account created/updated:', admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
