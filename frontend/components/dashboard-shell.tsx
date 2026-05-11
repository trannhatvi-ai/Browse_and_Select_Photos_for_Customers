'use client'

import { PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/sidebar-context'

interface DashboardShellProps {
  sidebar: React.ReactNode
  mobileUserBar: React.ReactNode
  children: React.ReactNode
}

export function DashboardShell({
  sidebar,
  mobileUserBar,
  children,
}: DashboardShellProps) {
  const { isSidebarOpen, toggleSidebar } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar Container */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) md:block border-r bg-sidebar overflow-visible',
          isSidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {sidebar}
      </div>

      {/* Main Content Area */}
      <main
        className={cn(
          'transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)',
          isSidebarOpen ? 'md:pl-64' : 'md:pl-20'
        )}
      >
        {/* Persistent Toggle Button with flipped positioning */}
        <div 
          className="hidden md:block fixed top-4 z-[60] transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)" 
          style={{ 
            left: isSidebarOpen ? '224px' : '100px', 
            transform: 'translateX(-50%)' 
          }}
        >
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full shadow-lg border transition-all duration-300",
              isSidebarOpen 
                ? "bg-sidebar-accent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/80"
                : "bg-background hover:bg-muted border-border"
            )}
            onClick={toggleSidebar}
            title={isSidebarOpen ? "Thu gọn" : "Mở rộng"}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile Header */}
        {mobileUserBar}

        {/* Page Content */}
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-4 lg:px-6 lg:pb-6 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  )
}
