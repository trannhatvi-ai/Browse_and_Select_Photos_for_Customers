'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  Camera,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  UserRound,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useSidebar } from '@/components/sidebar-context'
import { cn } from '@/lib/utils'

const baseNavItems = [
  { href: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/projects', label: 'Show chụp', icon: FolderOpen, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/schedule', label: 'Lịch show', icon: CalendarDays, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/notifications', label: 'Thông báo', icon: Bell, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/clients', label: 'Khách hàng', icon: UserRound, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/users', label: 'Người dùng', icon: Shield, roles: ['ADMIN'] },
  { href: '/dashboard/settings', label: 'Cài đặt', icon: Settings, roles: ['ADMIN', 'STUDIO'] },
]

export function DashboardSidebar({
  userRole = 'STUDIO',
  userName,
  userEmail,
}: {
  userRole?: string
  userName?: string | null
  userEmail?: string | null
}) {
  const pathname = usePathname()
  const { isSidebarOpen } = useSidebar()

  const navItems = baseNavItems.filter(item => item.roles.includes(userRole))

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn(
        'flex h-16 items-center border-none px-6',
        isSidebarOpen ? 'justify-start' : 'justify-center px-0'
      )}>
        {isSidebarOpen && (
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300">
            <Camera className="h-6 w-6" />
            <span className="text-lg font-semibold">Studio Pro</span>
          </div>
        )}
        {!isSidebarOpen && <Camera className="h-6 w-6" />}
      </div>

      <nav className="flex-1 space-y-1 overflow-hidden p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                !isSidebarOpen && 'justify-center px-0'
              )}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isSidebarOpen && <span className="transition-all duration-300">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2 overflow-hidden border-none p-4">
        {isSidebarOpen && (
          <div className="overflow-hidden whitespace-nowrap px-3 py-1.5">
            <p className="truncate text-xs font-medium">{userName || userEmail || 'Người dùng'}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{userRole === 'ADMIN' ? 'Quản trị viên' : 'Chủ Studio'}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground whitespace-nowrap',
            !isSidebarOpen && 'justify-center px-0'
          )}
          title="Đăng xuất"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {isSidebarOpen && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  )
}
