import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Home, FolderOpen, UserRound, Settings, Users } from 'lucide-react'
import { MobileUserBar } from '@/components/mobile-user-bar'
import { DashboardShell } from '@/components/dashboard-shell'
import { SidebarProvider } from '@/components/sidebar-context'

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

  const sidebar = (
    <DashboardSidebar
      userRole={userRole}
      userName={sessionUser?.name}
      userEmail={sessionUser?.email}
    />
  )

  const mobileUserBar = (
    <MobileUserBar
      userName={sessionUser?.name}
      userEmail={sessionUser?.email}
      userRole={userRole}
    />
  )

  return (
    <SidebarProvider>
      <DashboardShell sidebar={sidebar} mobileUserBar={mobileUserBar}>
        {children}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/dashboard" className="flex flex-col items-center p-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Home className="h-5 w-5" />
            <span className="mt-0.5 text-[10px]">Bảng</span>
          </Link>
          <Link href="/dashboard/projects" className="flex flex-col items-center p-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <FolderOpen className="h-5 w-5" />
            <span className="mt-0.5 text-[10px]">Show chụp</span>
          </Link>
          <Link href="/dashboard/clients" className="flex flex-col items-center p-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <UserRound className="h-5 w-5" />
            <span className="mt-0.5 text-[10px]">Khách</span>
          </Link>
          {userRole === 'ADMIN' && (
            <Link href="/dashboard/users" className="flex flex-col items-center p-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <Users className="h-5 w-5" />
              <span className="mt-0.5 text-[10px]">Người dùng</span>
            </Link>
          )}
          <Link href="/dashboard/settings" className="flex flex-col items-center p-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Settings className="h-5 w-5" />
            <span className="mt-0.5 text-[10px]">Cài đặt</span>
          </Link>
        </nav>
      </DashboardShell>
    </SidebarProvider>
  )
}
