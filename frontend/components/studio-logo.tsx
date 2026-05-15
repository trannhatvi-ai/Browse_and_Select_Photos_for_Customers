import Image from 'next/image'

import { cn } from '@/lib/utils'

type StudioLogoMarkProps = {
  className?: string
  imageClassName?: string
  priority?: boolean
  sizes?: string
  decorative?: boolean
}

export function StudioLogoMark({
  className,
  imageClassName,
  priority = false,
  sizes = '48px',
  decorative = false,
}: StudioLogoMarkProps) {
  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : 'Studio Pro'}
      role={decorative ? undefined : 'img'}
      className={cn(
        'relative inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-white/15',
        className
      )}
    >
      <Image
        src="/studio-pro-mark.png"
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className={cn('object-cover', imageClassName)}
      />
    </span>
  )
}

type StudioLogoProps = {
  className?: string
  markClassName?: string
  textClassName?: string
  priority?: boolean
  compact?: boolean
}

export function StudioLogo({
  className,
  markClassName,
  textClassName,
  priority = false,
  compact = false,
}: StudioLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <StudioLogoMark
        decorative={!compact}
        priority={priority}
        sizes="40px"
        className={cn('h-10 w-10 rounded-xl', markClassName)}
      />
      {!compact && (
        <span className={cn('text-lg font-semibold leading-none', textClassName)}>
          Studio Pro
        </span>
      )}
    </span>
  )
}

type StudioWordmarkProps = {
  className?: string
  priority?: boolean
  sizes?: string
}

export function StudioWordmark({
  className,
  priority = false,
  sizes = '220px',
}: StudioWordmarkProps) {
  return (
    <span
      aria-label="Studio Pro"
      role="img"
      className={cn('relative inline-flex h-20 w-56 shrink-0', className)}
    >
      <Image
        src="/studio-pro-logo.png"
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
      />
    </span>
  )
}
