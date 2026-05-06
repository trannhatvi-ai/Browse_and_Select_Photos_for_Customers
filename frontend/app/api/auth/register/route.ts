import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json()

    if (!email || !name || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: 'STUDIO' },
    })

    const { password: _, ...safe } = user
    return Response.json(safe, { status: 201 })
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
