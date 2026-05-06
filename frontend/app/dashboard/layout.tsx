import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any

  let userRole = sessionUser?.role as string | undefined
  if (!userRole && sessionUser?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { role: true },
    })
    userRole = dbUser?.role
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar userRole={userRole} userName={sessionUser?.name} userEmail={sessionUser?.email} />
      <main className="pl-64">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
