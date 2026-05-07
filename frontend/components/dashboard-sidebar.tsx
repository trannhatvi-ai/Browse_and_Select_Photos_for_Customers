'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  UserRound,
  Users,
  Settings,
  LogOut,
  Camera,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

const baseNavItems = [
  { href: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/projects', label: 'Show chụp', icon: FolderOpen, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/clients', label: 'Khách hàng', icon: UserRound, roles: ['ADMIN', 'STUDIO'] },
  { href: '/dashboard/users', label: 'Người dùng', icon: Shield, roles: ['ADMIN'] },
  { href: '/dashboard/settings', label: 'Cài đặt', icon: Settings, roles: ['ADMIN', 'STUDIO'] },
]

export function DashboardSidebar({ userRole = 'STUDIO', userName, userEmail }: { userRole?: string, userName?: string | null, userEmail?: string | null }) {
  const pathname = usePathname()

  const navItems = baseNavItems.filter(item => item.roles.includes(userRole))

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Camera className="h-6 w-6" />
        <span className="text-lg font-semibold">Studio Pro</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-sidebar-border p-4 space-y-2">
        <div className="px-3 py-1.5">
          <p className="text-xs font-medium truncate">{userName || userEmail || 'Người dùng'}</p>
          <p className="text-[10px] text-sidebar-foreground/50">{userRole === 'ADMIN' ? 'Quản trị viên' : 'Chủ Studio'}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
