'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileUserBarProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userRole?: string | null
}

export function MobileUserBar({ userName, userEmail, userRole }: MobileUserBarProps) {
  return (
    <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {userName || userEmail || 'Người dùng'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {userRole === 'ADMIN' ? 'Quản trị viên' : 'Chủ Studio'}
          </p>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        <span>Đăng xuất</span>
      </button>
    </div>
  )
}
