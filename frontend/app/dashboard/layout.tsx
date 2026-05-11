import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { Bell, CalendarDays, FolderOpen, Home, Settings, UserRound, Users } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { MobileUserBar } from '@/components/mobile-user-bar'
import { SidebarProvider } from '@/components/sidebar-context'
import { authOptions } from '@/lib/auth'
import { getCloudinaryUsageStatusForUser } from '@/lib/cloudinary-usage-status'
import { prisma } from '@/lib/db'
import { CloudinaryUsageProvider } from '@/components/cloudinary-usage-notice'

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

  const cloudinaryUsageStatus = sessionUser?.id
    ? await getCloudinaryUsageStatusForUser(sessionUser.id, userRole)
    : null

  const mobileItems = [
    { href: '/dashboard', label: 'Bảng', icon: Home, show: true },
    { href: '/dashboard/projects', label: 'Show', icon: FolderOpen, show: true },
    { href: '/dashboard/schedule', label: 'Lịch', icon: CalendarDays, show: true },
    { href: '/dashboard/notifications', label: 'Báo', icon: Bell, show: true },
    { href: '/dashboard/clients', label: 'Khách', icon: UserRound, show: true },
    { href: '/dashboard/users', label: 'Users', icon: Users, show: userRole === 'ADMIN' },
    { href: '/dashboard/settings', label: 'Cài đặt', icon: Settings, show: true },
  ].filter(item => item.show)

  return (
    <SidebarProvider>
      <CloudinaryUsageProvider status={cloudinaryUsageStatus}>
        <DashboardShell
          sidebar={
            <DashboardSidebar
              userRole={userRole}
              userName={sessionUser?.name}
              userEmail={sessionUser?.email}
            />
          }
          mobileUserBar={
            <MobileUserBar
              userName={sessionUser?.name}
              userEmail={sessionUser?.email}
              userRole={userRole}
            />
          }
        >
          {children}

          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="flex items-center gap-1 overflow-x-auto px-2">
              {mobileItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-w-14 flex-1 flex-col items-center p-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="mt-0.5 whitespace-nowrap text-[10px]">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </DashboardShell>
      </CloudinaryUsageProvider>
    </SidebarProvider>
  )
}
