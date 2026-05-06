import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, username, phone, name, password } = await req.json()

    if (!email || !username || !phone || !name || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, { phone }],
      },
    })
    if (existing) {
      return Response.json({ error: 'Email, username hoặc số điện thoại đã tồn tại' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email, username, phone, name, password: hashed, role: 'STUDIO' },
    })

    const { password: _, ...safe } = user
    return Response.json(safe, { status: 201 })
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
