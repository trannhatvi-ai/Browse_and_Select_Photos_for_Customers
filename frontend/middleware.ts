import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/projects/:path*',
    '/api/gallery/:path*',
    '/api/email/:path*',
    '/api/auth/register',
  ],
}
