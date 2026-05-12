import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public assets and auth routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth') || pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // Get token from next-auth JWT
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // If not authenticated, redirect to login
  if (!token) {
    const signInUrl = new URL('/login', req.url)
    signInUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(signInUrl)
  }

  const hasCompleteProfile = token.role === 'ADMIN' || token.profileComplete === true
  if (!hasCompleteProfile) {
    const completeProfileUrl = new URL('/complete-profile', req.url)
    completeProfileUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(completeProfileUrl)
  }

  // Admin-only area: block non-admins from /dashboard/users
  if (pathname.startsWith('/dashboard/users') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
}
