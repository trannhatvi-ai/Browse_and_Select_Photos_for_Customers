import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import FacebookProvider from 'next-auth/providers/facebook'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import { getPhoneLookupCandidates } from '@/lib/auth-verification'
import bcrypt from 'bcryptjs'

type OAuthRuntimeConfig = {
  enabled: boolean
  clientId: string
  clientSecret: string
}

type SocialProviderName = 'google' | 'facebook'

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

function isProfileComplete(user: any) {
  if (user?.role === 'ADMIN') return true
  return Boolean(
    user?.password &&
    user?.name?.trim?.() &&
    user?.username?.trim?.() &&
    user?.phone &&
    user?.settings?.studioName?.trim?.()
  )
}

async function getOrCreateSocialUser({
  provider,
  email,
  name,
  providerAccountId,
}: {
  provider: SocialProviderName
  email: string
  name?: string | null
  providerAccountId?: string | null
}) {
  const providerIdField = provider === 'google' ? 'googleId' : 'facebookId'
  const existingByProviderId = providerAccountId
    ? await prisma.user.findUnique({ where: { [providerIdField]: providerAccountId } as any })
    : null
  const existing = existingByProviderId ?? await prisma.user.findUnique({ where: { email } })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        [providerIdField]: (existing as any)[providerIdField] || providerAccountId || undefined,
        emailVerifiedAt: existing.emailVerifiedAt || new Date(),
        authProvider: existing.authProvider === 'credentials' && existing.password ? existing.authProvider : provider,
      } as any,
      include: { settings: true },
    })
  }

  return prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      username: await createUniqueUsername(email),
      password: null,
      role: 'STUDIO',
      authProvider: provider,
      [providerIdField]: providerAccountId || null,
      emailVerifiedAt: new Date(),
    } as any,
    include: { settings: true },
  })
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function getAdminOAuthConfig(): Promise<{ google: OAuthRuntimeConfig | null; facebook: OAuthRuntimeConfig | null }> {
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { google: null, facebook: null }
  }

  function readProviderConfig(key: 'google' | 'facebook') {
    const provider = (raw as Record<string, unknown>)[key]
    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) return null

    const config = provider as Record<string, unknown>
    const clientId = getString(config.oauthClientId)
    const clientSecret = getString(config.oauthClientSecret)
    const hasAdminConfig = 'enabled' in config || Boolean(clientId || clientSecret)
    if (!hasAdminConfig) return null

    return {
      enabled: config.enabled === true,
      clientId,
      clientSecret,
    }
  }

  return {
    google: readProviderConfig('google'),
    facebook: readProviderConfig('facebook'),
  }
}

function resolveGoogleOAuthConfig(adminConfig?: OAuthRuntimeConfig | null): OAuthRuntimeConfig {
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

function resolveFacebookOAuthConfig(adminConfig?: OAuthRuntimeConfig | null): OAuthRuntimeConfig {
  if (adminConfig) {
    return {
      enabled: adminConfig.enabled && Boolean(adminConfig.clientId && adminConfig.clientSecret),
      clientId: adminConfig.clientId,
      clientSecret: adminConfig.clientSecret,
    }
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID || ''
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || ''
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
  }
}

function createProviders(
  googleConfig?: OAuthRuntimeConfig | null,
  facebookConfig?: OAuthRuntimeConfig | null
): NextAuthOptions['providers'] {
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
        const phoneCandidates = getPhoneLookupCandidates(identifier)

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier },
              ...(phoneCandidates.length ? [{ phone: { in: phoneCandidates } }] : []),
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
          phoneVerifiedAt: user.phoneVerifiedAt,
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

  const resolvedFacebookConfig = resolveFacebookOAuthConfig(facebookConfig)
  if (resolvedFacebookConfig.enabled) {
    providers.push(
      FacebookProvider({
        clientId: resolvedFacebookConfig.clientId,
        clientSecret: resolvedFacebookConfig.clientSecret,
      })
    )
  }

  return providers
}

export function buildAuthOptions(
  googleConfig?: OAuthRuntimeConfig | null,
  facebookConfig?: OAuthRuntimeConfig | null
): NextAuthOptions {
  return {
    providers: createProviders(googleConfig, facebookConfig),
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== 'google' && account?.provider !== 'facebook') return true

        const socialProfile = profile as { email?: string; name?: string; email_verified?: boolean }
        if (!socialProfile.email) return false
        if (account.provider === 'google' && socialProfile.email_verified === false) return false

        await getOrCreateSocialUser({
          provider: account.provider as SocialProviderName,
          email: socialProfile.email.toLowerCase(),
          name: socialProfile.name,
          providerAccountId: account.providerAccountId,
        })

        return true
      },
      session({ token, session }) {
        if (token && session.user) {
          const sessionUser = session.user as any
          sessionUser.id = token.sub as string
          sessionUser.role = token.role as string
          sessionUser.phone = token.phone as string | undefined
          sessionUser.phoneVerifiedAt = token.phoneVerifiedAt as string | undefined
          sessionUser.profileComplete = token.profileComplete as boolean | undefined
        }
        return session
      },
      async jwt({ token, user, account, profile }) {
        if (account?.provider === 'google' || account?.provider === 'facebook') {
          const socialProfile = profile as { email?: string; name?: string } | undefined
          const email = socialProfile?.email?.toLowerCase() || token.email?.toLowerCase()
          if (email) {
            const dbUser = await getOrCreateSocialUser({
              provider: account.provider as SocialProviderName,
              email,
              name: socialProfile?.name || token.name,
              providerAccountId: account.providerAccountId,
            })
            token.sub = dbUser.id
            token.role = dbUser.role
            token.email = dbUser.email
            token.name = dbUser.name
            token.phone = dbUser.phone
            token.phoneVerifiedAt = dbUser.phoneVerifiedAt?.toISOString()
            token.profileComplete = isProfileComplete(dbUser)
          }
        } else if (user) {
          token.role = (user as any).role
          token.phone = (user as any).phone
          token.phoneVerifiedAt = (user as any).phoneVerifiedAt?.toISOString?.() || (user as any).phoneVerifiedAt
        }

        if (token.sub) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              password: true,
              name: true,
              username: true,
              phone: true,
              phoneVerifiedAt: true,
              emailVerifiedAt: true,
              settings: { select: { studioName: true } },
            },
          })
          if (dbUser) {
            token.role = dbUser.role
            token.phone = dbUser.phone
            token.phoneVerifiedAt = dbUser.phoneVerifiedAt?.toISOString()
            token.profileComplete = isProfileComplete(dbUser)
          }
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
    const adminConfig = await getAdminOAuthConfig()
    return buildAuthOptions(adminConfig.google, adminConfig.facebook)
  } catch (error) {
    console.error('Failed to load admin OAuth settings:', error)
    return buildAuthOptions()
  }
}

export const authOptions: NextAuthOptions = buildAuthOptions()
