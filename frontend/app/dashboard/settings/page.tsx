'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Save, Loader2, FlaskConical, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()
  const [cloudinaryGuideOpen, setCloudinaryGuideOpen] = useState(false)

  // Auto-open Cloudinary guide when redirected from project creation
  useEffect(() => {
    if (searchParams.get('setup') === 'cloudinary') {
      setCloudinaryGuideOpen(true)
      toast.warning('Bạn cần cấu hình Cloudinary trước khi tạo show chụp. Hãy làm theo hướng dẫn bên dưới.')
    }
  }, [searchParams])
  const [studioName, setStudioName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('')
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('')
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setStudioName(data.studioName)
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setCloudinaryCloudName(data.cloudinaryCloudName || '')
        setCloudinaryApiKey(data.cloudinaryApiKey || '')
        setCloudinaryApiSecret(data.cloudinaryApiSecret || '')
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioName,
        phone,
        email,
        cloudinaryCloudName,
        cloudinaryApiKey,
        cloudinaryApiSecret
      })
    })
    
    if (res.ok) {
      toast.success('Đã lưu cài đặt thành công!')
    } else {
      toast.error('Lỗi khi lưu cài đặt!')
    }
    setSaving(false)
  }

  const handleTestCloudinary = async () => {
    const res = await fetch('/api/settings/cloudinary/test', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success(data.message || 'Cloudinary kết nối thành công!')
    } else {
      toast.error(data.error || 'Cloudinary test thất bại!')
    }
  }

  if (loading) return <div className="p-8">Đang tải cấu hình...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin Studio</CardTitle>
            <CardDescription>Thông tin này sẽ hiển thị trên Gallery của khách hàng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên Studio</Label>
              <Input id="name" value={studioName} onChange={(e) => setStudioName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email liên hệ</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Cloudinary riêng cho studio</CardTitle>
                <CardDescription>Nhập thông tin Cloudinary của từng chủ studio và kiểm tra kết nối trước khi dùng.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloudinaryGuideOpen(true)}
                className="gap-2 sm:self-start"
              >
                <Info className="h-4 w-4" />
                Hướng dẫn tạo Cloudinary
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cloud-name">Cloud Name</Label>
              <Input id="cloud-name" value={cloudinaryCloudName} onChange={(e) => setCloudinaryCloudName(e.target.value)} placeholder="your_cloud_name" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cloud-key">API Key</Label>
                <Input id="cloud-key" value={cloudinaryApiKey} onChange={(e) => setCloudinaryApiKey(e.target.value)} placeholder="your_api_key" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cloud-secret">API Secret</Label>
                <Input id="cloud-secret" type="password" value={cloudinaryApiSecret} onChange={(e) => setCloudinaryApiSecret(e.target.value)} placeholder="your_api_secret" />
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleTestCloudinary} className="gap-2">
              <FlaskConical className="h-4 w-4" /> Test Cloudinary
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <Dialog open={cloudinaryGuideOpen} onOpenChange={setCloudinaryGuideOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto sm:max-w-5xl">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle>Hướng dẫn tạo tài khoản Cloudinary</DialogTitle>
            <DialogDescription>
              Làm theo 3 bước dưới đây tại{' '}
              <a
                href="https://cloudinary.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                cloudinary.com
                <ExternalLink className="h-3.5 w-3.5" />
              </a>{' '}
              để tạo tài khoản bằng Google và lấy đủ API key cho studio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Bước 1: Đăng nhập bằng Google</p>
                <p className="text-sm text-muted-foreground">
                  Vào Cloudinary và chọn nút đăng nhập bằng Google để tạo tài khoản nhanh.
                </p>
              </div>
              <Image
                src="/cloudinary_setup/b1.png"
                alt="Cloudinary login bằng Google"
                width={1200}
                height={900}
                className="h-auto w-full rounded-lg border object-contain"
              />
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Bước 2: Mở View API Keys</p>
                <p className="text-sm text-muted-foreground">
                  Sau khi vào dashboard, nhấn vào nút <span className="font-medium">View API Keys</span> để xem thông tin cần điền vào hệ thống.
                </p>
              </div>
              <Image
                src="/cloudinary_setup/b2.png"
                alt="Cloudinary hướng dẫn nhấn View API Keys"
                width={1200}
                height={900}
                className="h-auto w-full rounded-lg border object-contain"
              />
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Bước 3: Lấy Product Environment Credentials</p>
                <p className="text-sm text-muted-foreground">
                  Ở mục Product Environment Credentials, hãy nhấn vào biểu tượng con mắt để hiện API Secret trước khi copy sang hệ thống.
                </p>
              </div>
              <Image
                src="/cloudinary_setup/b3.png"
                alt="Cloudinary Product Environment Credentials"
                width={1200}
                height={900}
                className="h-auto w-full rounded-lg border object-contain"
              />
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Lưu ý: API Secret bị ẩn mặc định. Bạn cần nhấn biểu tượng hiện mật khẩu ở cạnh trường này thì mới sao chép được chính xác.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
