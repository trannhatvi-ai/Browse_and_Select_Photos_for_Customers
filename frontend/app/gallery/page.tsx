 'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StudioWordmark } from '@/components/studio-logo'

export default function GalleryHomePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    router.push(`/gallery/${code.trim().toUpperCase()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-4 flex justify-center">
            <StudioWordmark className="h-20 w-56" priority />
          </div>
          <CardTitle className="sr-only">Studio Pro</CardTitle>
          <CardDescription>Nhập mã truy cập để xem và chọn ảnh của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccess} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Mã truy cập (VD: WED-2024)"
                className="pl-10 h-12 text-lg uppercase font-mono tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg gap-2" disabled={loading || !code}>
              {loading ? 'Đang kiểm tra...' : 'Truy cập ngay'} <ArrowRight className="h-5 w-5" />
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Bạn là Studio? <a href="/dashboard" className="text-primary hover:underline font-medium">Đăng nhập quản lý</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
