import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

type GoogleOAuthRuntimeConfig = {
  enabled: boolean
  clientId: string
  clientSecret: string
}

async function createUniqueUsername(email: string) {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'studio'

  for (let index = 0; index < 20; index++) {
    const candidate = index === 0 ? base : `${base}_${index + 1}`
    const existing = await prisma.user.findUnique({ where: { username: candidate } })
    if (!existing) return candidate
  }

  return `${base}_${Date.now()}`
}

async function getOrCreateGoogleUser({
  email,
  name,
  googleId,
}: {
  email: string
  name?: string | null
  googleId?: string | null
}) {
  const existingByGoogleId = googleId
    ? await prisma.user.findUnique({ where: { googleId } })
    : null
  const existing = existingByGoogleId ?? await prisma.user.findUnique({ where: { email } })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: existing.googleId || googleId || undefined,
        emailVerifiedAt: existing.emailVerifiedAt || new Date(),
        authProvider: existing.authProvider === 'credentials' && existing.password ? existing.authProvider : 'google',
      },
    })
  }

  return prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      username: await createUniqueUsername(email),
      password: null,
      role: 'STUDIO',
      authProvider: 'google',
      googleId: googleId || null,
      emailVerifiedAt: new Date(),
    },
  })
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function getAdminGoogleOAuthConfig(): Promise<GoogleOAuthRuntimeConfig | null> {
  const settings = await prisma.settings.findFirst({
    where: {
      user: {
        role: 'ADMIN',
      },
    },
    select: {
      adminIntegrationConfig: true,
    },
  })

  const raw = settings?.adminIntegrationConfig
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const google = (raw as { google?: unknown }).google
  if (!google || typeof google !== 'object' || Array.isArray(google)) return null

  const googleConfig = google as Record<string, unknown>
  const clientId = getString(googleConfig.oauthClientId)
  const clientSecret = getString(googleConfig.oauthClientSecret)
  const hasAdminGoogleConfig = 'enabled' in googleConfig || Boolean(clientId || clientSecret)
  if (!hasAdminGoogleConfig) return null

  return {
    enabled: googleConfig.enabled === true,
    clientId,
    clientSecret,
  }
}

function resolveGoogleOAuthConfig(adminConfig?: GoogleOAuthRuntimeConfig | null): GoogleOAuthRuntimeConfig {
  if (adminConfig) {
    return {
      enabled: adminConfig.enabled && Boolean(adminConfig.clientId && adminConfig.clientSecret),
      clientId: adminConfig.clientId,
      clientSecret: adminConfig.clientSecret,
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
  }
}

function createProviders(googleConfig?: GoogleOAuthRuntimeConfig | null): NextAuthOptions['providers'] {
  const providers: NextAuthOptions['providers'] = [
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
              { email: identifier.toLowerCase() },
              { username: identifier },
              { phone: identifier.replace(/[\s().-]/g, '') },
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

        const hasPendingContactVerification = Boolean(
          user.emailVerificationCodeHash ||
          user.emailVerificationExpires ||
          user.phoneVerificationCodeHash ||
          user.phoneVerificationExpires
        )

        if (user.authProvider === 'credentials' && hasPendingContactVerification && (!user.emailVerifiedAt || !user.phoneVerifiedAt)) {
          throw new Error('CONTACT_NOT_VERIFIED')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          phone: user.phone,
          role: user.role,
        } as any
      },
    }),
  ]

  const resolvedGoogleConfig = resolveGoogleOAuthConfig(googleConfig)
  if (resolvedGoogleConfig.enabled) {
    providers.push(
      GoogleProvider({
        clientId: resolvedGoogleConfig.clientId,
        clientSecret: resolvedGoogleConfig.clientSecret,
      })
    )
  }

  return providers
}

export function buildAuthOptions(googleConfig?: GoogleOAuthRuntimeConfig | null): NextAuthOptions {
  return {
    providers: createProviders(googleConfig),
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== 'google') return true

        const googleProfile = profile as { email?: string; name?: string; email_verified?: boolean }
        if (!googleProfile.email || googleProfile.email_verified === false) return false

        await getOrCreateGoogleUser({
          email: googleProfile.email.toLowerCase(),
          name: googleProfile.name,
          googleId: account.providerAccountId,
        })

        return true
      },
      session({ token, session }) {
        if (token && session.user) {
          const sessionUser = session.user as any
          sessionUser.id = token.sub as string
          sessionUser.role = token.role as string
        }
        return session
      },
      async jwt({ token, user, account, profile }) {
        if (account?.provider === 'google') {
          const googleProfile = profile as { email?: string; name?: string } | undefined
          const email = googleProfile?.email?.toLowerCase() || token.email?.toLowerCase()
          if (email) {
            const dbUser = await getOrCreateGoogleUser({
              email,
              name: googleProfile?.name || token.name,
              googleId: account.providerAccountId,
            })
            token.sub = dbUser.id
            token.role = dbUser.role
            token.email = dbUser.email
            token.name = dbUser.name
          }
        } else if (user) {
          token.role = (user as any).role
        }
        return token
      },
    },
    pages: {
      signIn: '/login',
    },
    session: {
      strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
}

export async function getAuthOptions() {
  try {
    return buildAuthOptions(await getAdminGoogleOAuthConfig())
  } catch (error) {
    console.error('Failed to load admin Google OAuth settings:', error)
    return buildAuthOptions()
  }
}

export const authOptions: NextAuthOptions = buildAuthOptions()
