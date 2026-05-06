/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['bull', 'canvas', '@prisma/client'],
  middleware: async (req) => {
    const { NextResponse } = await import('next/server')
    const { withAuth } = await import('next-auth/middleware')

    return await withAuth({
      pages: {
        signIn: '/login',
      },
    })(req)
  },
  matcher: ['/dashboard/:path*'],
}

export default nextConfig
