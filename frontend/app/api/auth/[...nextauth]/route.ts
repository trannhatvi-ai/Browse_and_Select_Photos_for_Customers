import NextAuth from 'next-auth'
import { getAuthOptions } from '@/lib/auth'

async function handler(req: Request, context: any) {
  return NextAuth(await getAuthOptions())(req, context)
}

export { handler as GET, handler as POST }
