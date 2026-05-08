'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Save, Loader2, FlaskConical, Info, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

class SyncAIError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'SyncAIError'
    this.status = status
  }
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingFull, setSyncingFull] = useState(false)
  const [syncingIncremental, setSyncingIncremental] = useState(false)
  const searchParams = useSearchParams()
  const [cloudinaryGuideOpen, setCloudinaryGuideOpen] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [studioName, setStudioName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('')
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('')
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('')
  const [allowSharedCloudinary, setAllowSharedCloudinary] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [globalStats, setGlobalStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchGlobalStats = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/ai-stats/admin/stats/global')
      if (res.ok) {
        const data = await res.json()
        setGlobalStats(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  // Auto-open Cloudinary guide when redirected from project creation
  useEffect(() => {
    if (userRole === 'ADMIN') {
      void fetchGlobalStats()
    }
  }, [userRole])

  useEffect(() => {
    if (searchParams.get('setup') === 'cloudinary') {
      setCloudinaryGuideOpen(true)
      toast.warning('Bạn cần cấu hình Cloudinary trước khi tạo show chụp. Hãy làm theo hướng dẫn bên dưới.')
    }
  }, [searchParams])

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
        setAllowSharedCloudinary(data.allowSharedCloudinary ?? true)
        setUserRole(data.userRole || '')
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
        cloudinaryApiSecret,
        allowSharedCloudinary
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
        {userRole === 'ADMIN' && (
          <>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  Cấu hình hệ thống (Dành cho Admin)
                </CardTitle>
                <CardDescription>Cài đặt chung cho toàn bộ các studio trong hệ thống.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-background p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="shared-cloudinary">Cho phép dùng chung Cloudinary của Admin</Label>
                    <p className="text-xs text-muted-foreground">
                      Nếu bật, các studio chưa có cấu hình riêng sẽ dùng chung tài khoản Cloudinary của Admin.
                      Nếu tắt, họ bắt buộc phải cấu hình tài khoản riêng mới có thể tạo show chụp mới.
                    </p>
                  </div>
                  <Switch
                    id="shared-cloudinary"
                    checked={allowSharedCloudinary}
                    onCheckedChange={setAllowSharedCloudinary}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-amber-700 flex items-center gap-2">
                  Bảo trì hệ thống AI
                </CardTitle>
                <CardDescription>
                  Cập nhật lại toàn bộ vector nhúng (embedding) cho tất cả các show chụp trong hệ thống.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                   <div className="rounded-xl border bg-blue-50/50 p-4 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-blue-700">Database Context</span>
                        <span className="font-bold">{globalStats?.context_photos_db ?? 0} / {globalStats?.total_photos ?? 0}</span>
                      </div>
                      <Progress value={globalStats?.percentage_db ?? 0} className="h-2 bg-blue-100" />
                      <p className="text-[10px] text-blue-600 italic">Tổng ảnh đã có mô tả AI lưu trong Postgres</p>
                   </div>
                   
                   <div className="rounded-xl border bg-emerald-50/50 p-4 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-emerald-700">Redis Indexing</span>
                        <span className="font-bold">{globalStats?.indexed_photos_redis ?? 0} / {globalStats?.total_photos ?? 0}</span>
                      </div>
                      <Progress value={globalStats?.percentage_redis ?? 0} className="h-2 bg-emerald-100" />
                      <p className="text-[10px] text-emerald-600 italic">Tổng ảnh đã sẵn sàng để tìm kiếm (Vector)</p>
                   </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mb-6 border-dashed"
                  onClick={fetchGlobalStats}
                  disabled={loadingStats}
                >
                  {loadingStats ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <FlaskConical className="h-3 w-3 mr-2" />}
                  Lấy số liệu hệ thống mới nhất
                </Button>

                <div className="space-y-3 rounded-lg border border-amber-200 bg-background p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Đồng bộ hoàn toàn (Rebuild tất cả)</p>
                    <p className="text-xs text-muted-foreground">
                      Xóa toàn bộ Vector cũ trong Redis và nhúng lại từ đầu bằng Gemini. Dùng khi muốn cập nhật toàn diện dữ liệu AI.
                    </p>
                  </div>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                    onClick={() => {
                      setSyncingFull(true)
                      const promise = fetch('/api/ai-stats/sync/all', { method: 'POST' }).then(async res => {
                        if (!res.ok) {
                          let message = 'Lỗi đồng bộ'
                          try {
                            const data = await res.json()
                            message = data.error || data.detail || message
                          } catch {}
                          throw new Error(message)
                        }
                        return res.json()
                      })

                      toast.promise(promise, {
                        loading: 'Đang bắt đầu đồng bộ toàn bộ...',
                        success: (data: any) => `Đã bắt đầu cho ${data.queued_count} show chụp!`,
                        error: (err) => err.message
                      })
                      promise.finally(() => setSyncingFull(false))
                    }}
                    disabled={syncingFull || syncingIncremental}
                  >
                    {syncingFull ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Bắt đầu ngay
                  </Button>
                </div>

                <div className="space-y-3 rounded-lg border border-blue-200 bg-background p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ưu tiên embed (Chỉ nhúng ảnh mới)</p>
                    <p className="text-xs text-muted-foreground">
                      Chỉ gửi những ảnh chưa có ngữ cảnh tới Gemini. Tiết kiệm chi phí và thời gian.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-blue-200 hover:bg-blue-100 text-blue-700 w-full sm:w-auto"
                    onClick={() => {
                      setSyncingIncremental(true)
                      const promise = fetch('/api/ai-stats/sync/incremental', { method: 'POST' }).then(async res => {
                        if (!res.ok) {
                          let message = 'Lỗi đồng bộ'
                          try {
                            const data = await res.json()
                            message = data.error || data.detail || message
                          } catch {}
                          throw new Error(message)
                        }
                        return res.json()
                      })

                      toast.promise(promise, {
                        loading: 'Đang chuẩn bị đồng bộ bổ sung...',
                        success: (data: any) => `Đã bắt đầu xử lý cho ${data.queued_count} show chụp!`,
                        error: (err) => err.message
                      })
                      promise.finally(() => setSyncingIncremental(false))
                    }}
                    disabled={syncingFull || syncingIncremental}
                  >
                    {syncingIncremental ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Ưu tiên embed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

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
        <DialogContent className="max-h-[95vh] !w-[95vw] sm:!w-[92vw] lg:!w-[85vw] xl:!w-[1200px] !max-w-none sm:!max-w-none overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-2xl">Hướng dẫn tạo tài khoản Cloudinary</DialogTitle>
            <DialogDescription className="text-base">
              Làm theo 3 bước dưới đây tại{' '}
              <a
                href="https://cloudinary.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-primary underline-offset-4 hover:underline"
              >
                cloudinary.com
                <ExternalLink className="h-4 w-4" />
              </a>{' '}
              để tạo tài khoản bằng Google và lấy đủ API key cho studio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                step: 1,
                title: 'Đăng nhập bằng Google',
                desc: 'Vào Cloudinary và chọn nút đăng nhập bằng Google để tạo tài khoản nhanh.',
                src: '/cloudinary_setup/b1.png',
                alt: 'Cloudinary login bằng Google'
              },
              {
                step: 2,
                title: 'Mở View API Keys',
                desc: 'Sau khi vào dashboard, chọn Next.js và sau đó nhấn vào nút View API Keys để xem thông tin cần điền vào hệ thống.',
                src: '/cloudinary_setup/b2.png',
                alt: 'Cloudinary hướng dẫn nhấn View API Keys'
              },
              {
                step: 3,
                title: 'Lấy Product Environment Credentials',
                desc: 'Ở mục Product Environment Credentials, hãy nhấn vào biểu tượng con mắt để hiện API Secret trước khi copy sang hệ thống.',
                src: '/cloudinary_setup/b3.png',
                alt: 'Cloudinary Product Environment Credentials'
              }
            ].map((item) => (
              <div key={item.step} className="space-y-4 rounded-xl border bg-muted/30 p-5 transition-colors hover:bg-muted/50">
                <div className="space-y-1.5">
                  <p className="text-base font-bold text-primary">Bước {item.step}: {item.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
                <div 
                  className="group relative cursor-zoom-in overflow-hidden rounded-lg border bg-background transition-all hover:ring-2 hover:ring-primary/50"
                  onClick={() => setZoomedImage(item.src)}
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    width={1200}
                    height={900}
                    className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/5">
                    <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Nhấn để phóng to
                    </span>
                  </div>
                </div>
                {item.step === 3 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-normal text-amber-900">
                    <span className="font-bold">Lưu ý:</span> API Secret bị ẩn mặc định. Bạn cần nhấn biểu tượng hiện mật khẩu ở cạnh trường này thì mới sao chép được chính xác.
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent 
          className="max-h-[98vh] !w-[98vw] sm:!w-[95vw] !max-w-none sm:!max-w-none overflow-hidden border-none bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Xem ảnh phóng to</DialogTitle>
            <DialogDescription>Hình ảnh chi tiết bước hướng dẫn Cloudinary</DialogDescription>
          </DialogHeader>
          {zoomedImage && (
            <div className="relative flex h-full w-full items-center justify-center">
              <div className="relative overflow-hidden rounded-xl bg-background shadow-2xl">
                <Image
                  src={zoomedImage}
                  alt="Zoomed view"
                  width={2400}
                  height={1800}
                  className="max-h-[90vh] w-auto object-contain"
                  priority
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-4 h-10 w-10 rounded-full bg-black/50 text-white shadow-lg backdrop-blur-md hover:bg-black/70 hover:text-white"
                  onClick={() => setZoomedImage(null)}
                >
                  <XIcon className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
