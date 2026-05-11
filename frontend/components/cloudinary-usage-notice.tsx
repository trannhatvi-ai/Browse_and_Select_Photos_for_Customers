'use client'

import Link from 'next/link'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { Cloud, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CloudinaryUsageStatus } from '@/lib/cloudinary-usage-status'

const defaultCloudinaryUsageStatus: CloudinaryUsageStatus = {
  cloudinaryUsageMode: 'not-configured',
  adminSharedCloudinaryAvailable: false,
  isUsingSharedCloudinary: false,
}

const CloudinaryUsageContext = createContext<CloudinaryUsageStatus>(defaultCloudinaryUsageStatus)

const sharedCloudinaryTitle = 'Studio đang dùng chung Cloudinary của Admin'
const sharedCloudinaryMessage = 'Hiện tài khoản của bạn đang lưu ảnh bằng Cloudinary dùng chung với các studio khác. Bạn nên cấu hình Cloudinary riêng để có dung lượng độc lập, upload thoải mái hơn và tránh bị ảnh hưởng khi nhiều studio cùng sử dụng.'

export function CloudinaryUsageProvider({
  status,
  children,
}: {
  status?: CloudinaryUsageStatus | null
  children: ReactNode
}) {
  return (
    <CloudinaryUsageContext.Provider value={status ?? defaultCloudinaryUsageStatus}>
      {children}
    </CloudinaryUsageContext.Provider>
  )
}

export function useCloudinaryUsage() {
  return useContext(CloudinaryUsageContext)
}

export function SharedCloudinaryNotice({ className }: { className?: string }) {
  const { isUsingSharedCloudinary } = useCloudinaryUsage()

  if (!isUsingSharedCloudinary) return null

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="font-medium">{sharedCloudinaryTitle}</p>
          <p className="text-xs leading-relaxed text-amber-800">{sharedCloudinaryMessage}</p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
        <Link href="/dashboard/settings">Cấu hình riêng</Link>
      </Button>
    </div>
  )
}

export function SharedCloudinaryLogoIndicator({
  popoverSide = 'bottom',
}: {
  popoverSide?: 'bottom' | 'right'
}) {
  const { isUsingSharedCloudinary } = useCloudinaryUsage()
  const [isOpen, setIsOpen] = useState(false)

  if (!isUsingSharedCloudinary) return null

  return (
    <div className="group relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={sharedCloudinaryTitle}
        aria-expanded={isOpen}
        title={sharedCloudinaryTitle}
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        onClick={() => setIsOpen(value => !value)}
      >
        <Cloud className="h-3.5 w-3.5" />
        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
      </button>
      <div
        className={cn(
          'pointer-events-none absolute z-[80] w-72 rounded-lg border border-amber-200 bg-white p-3 text-left text-xs leading-relaxed text-amber-900 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
          popoverSide === 'right'
            ? 'left-full top-1/2 ml-2 -translate-y-1/2'
            : 'left-0 top-full mt-2',
          isOpen && 'pointer-events-auto opacity-100'
        )}
      >
        <p className="mb-1 font-semibold">{sharedCloudinaryTitle}</p>
        <p className="text-amber-800">{sharedCloudinaryMessage}</p>
        <Link href="/dashboard/settings" className="mt-2 inline-flex font-medium text-amber-950 underline-offset-4 hover:underline">
          Cấu hình Cloudinary riêng
        </Link>
      </div>
    </div>
  )
}
