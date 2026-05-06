import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Studio Admin',
      credentials: {
        identifier: { label: 'Email / Username / Số điện thoại', type: 'text', placeholder: 'admin / 090...' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        const identifier = credentials.identifier.trim()

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { username: identifier },
              { phone: identifier },
            ],
          },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          phone: user.phone,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
