'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, Save, Loader2, FlaskConical, Info, XIcon, Trash2, Eye, EyeOff, KeyRound, Send, Mail } from 'lucide-react'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

class SyncAIError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'SyncAIError'
    this.status = status
  }
}

type CloudinaryAccountItem = {
  id: string
  label: string
  cloudName: string
  apiKey: string
  enabled: boolean
  usedBytes: number
  limitBytes: number
  lastCheckedAt?: string | null
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${Number(value.toFixed(2))} ${units[index]}`
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingCloudinary, setTestingCloudinary] = useState(false)
  const [syncingFull, setSyncingFull] = useState(false)
  const [syncingIncremental, setSyncingIncremental] = useState(false)
  const searchParams = useSearchParams()
  const [cloudinaryGuideOpen, setCloudinaryGuideOpen] = useState(false)
  const [cloudinaryRequirementOpen, setCloudinaryRequirementOpen] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [studioName, setStudioName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('')
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('')
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('')
  const [cloudinaryAccounts, setCloudinaryAccounts] = useState<CloudinaryAccountItem[]>([])
  const [savingCloudinaryAccount, setSavingCloudinaryAccount] = useState(false)
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false)
  const [allowSharedCloudinary, setAllowSharedCloudinary] = useState(true)
  const [adminSharedCloudinaryAvailable, setAdminSharedCloudinaryAvailable] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [globalStats, setGlobalStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [flushing, setFlushing] = useState(false)
  const [vlmProvider, setVlmProvider] = useState('gemini')
  const [vlmApiKey, setVlmApiKey] = useState('')
  const [vlmApiBase, setVlmApiBase] = useState('https://models.inference.ai.azure.com')
  const [vlmModelId, setVlmModelId] = useState('gpt-4o-mini')
  const [showAdminIntegrationSecrets, setShowAdminIntegrationSecrets] = useState(false)
  const [appOrigin, setAppOrigin] = useState('')
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [googleApiKey, setGoogleApiKey] = useState('')
  const [googleOauthClientId, setGoogleOauthClientId] = useState('')
  const [googleOauthClientSecret, setGoogleOauthClientSecret] = useState('')
  const [resendEnabled, setResendEnabled] = useState(false)
  const [resendApiKey, setResendApiKey] = useState('')
  const [resendFromEmail, setResendFromEmail] = useState('')
  const [telegramBotEnabled, setTelegramBotEnabled] = useState(false)
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramDefaultChatId, setTelegramDefaultChatId] = useState('')
  const [activeTasks, setActiveTasks] = useState<any[]>([])

  // Auto-open Cloudinary guide when redirected from project creation
  const fetchGlobalStats = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/ai-stats/admin/stats/global')
      if (res.ok) {
        const data = await res.json()
        setGlobalStats(data)
      } else {
        toast.error('Lỗi tải số liệu hệ thống')
      }
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchActiveTasks = async () => {
    try {
      const res = await fetch('/api/ai-stats/admin/tasks/active')
      if (res.ok) {
        const data = await res.json()
        setActiveTasks(Array.isArray(data) ? data : (data.tasks || []))
      }
    } catch {}
  }

  const fetchCloudinaryAccounts = async () => {
    try {
      const res = await fetch('/api/settings/cloudinary/accounts')
      if (!res.ok) return
      const data = await res.json()
      setCloudinaryAccounts(Array.isArray(data.accounts) ? data.accounts : [])
    } catch {}
  }

  useEffect(() => {
    if (userRole !== 'ADMIN') return
    
    void fetchGlobalStats()
    void fetchActiveTasks()
  }, [userRole])

  useEffect(() => {
    if (searchParams.get('setup') === 'cloudinary') {
      setCloudinaryRequirementOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    setAppOrigin(window.location.origin)
  }, [])

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
        setAdminSharedCloudinaryAvailable(data.adminSharedCloudinaryAvailable ?? false)
        setVlmProvider(data.vlmProvider || 'gemini')
        setVlmApiKey(data.vlmApiKey || '')
        setVlmApiBase(data.vlmApiBase || 'https://models.inference.ai.azure.com')
        setVlmModelId(data.vlmModelId || 'gpt-4o-mini')
        const adminIntegration = data.adminIntegrationConfig || {}
        setGoogleEnabled(adminIntegration.google?.enabled ?? false)
        setGoogleApiKey(adminIntegration.google?.apiKey || '')
        setGoogleOauthClientId(adminIntegration.google?.oauthClientId || '')
        setGoogleOauthClientSecret(adminIntegration.google?.oauthClientSecret || '')
        setResendEnabled(adminIntegration.resend?.enabled ?? false)
        setResendApiKey(adminIntegration.resend?.apiKey || '')
        setResendFromEmail(adminIntegration.resend?.fromEmail || '')
        setTelegramBotEnabled(adminIntegration.telegram?.enabled ?? false)
        setTelegramBotToken(adminIntegration.telegram?.botToken || '')
        setTelegramDefaultChatId(adminIntegration.telegram?.defaultChatId || '')
        setUserRole(data.userRole || '')
        setLoading(false)
      })
    void fetchCloudinaryAccounts()
  }, [])

  const hasCompleteStudioCloudinary = cloudinaryAccounts.length > 0 ||
    [cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret].every(value => value.trim().length > 0)
  const isUsingSharedCloudinary = userRole !== 'ADMIN' && adminSharedCloudinaryAvailable && !hasCompleteStudioCloudinary
  const googleRedirectUri = `${appOrigin || 'http://localhost:3000'}/api/auth/callback/google`

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
        allowSharedCloudinary,
        vlmProvider,
        vlmApiKey,
        vlmApiBase,
        vlmModelId,
        adminIntegrationConfig: {
          google: {
            enabled: googleEnabled,
            apiKey: googleApiKey,
            oauthClientId: googleOauthClientId,
            oauthClientSecret: googleOauthClientSecret,
          },
          resend: {
            enabled: resendEnabled,
            apiKey: resendApiKey,
            fromEmail: resendFromEmail,
          },
          telegram: {
            enabled: telegramBotEnabled,
            botToken: telegramBotToken,
            defaultChatId: telegramDefaultChatId,
          },
        }
      })
    })

    if (res.ok) {
      toast.success('Đã lưu cài đặt thành công!')
    } else {
      toast.error('Lỗi khi lưu cài đặt!')
    }
    setSaving(false)
  }
  
  const handleFlushVectors = async () => {
    setFlushing(true)
    try {
      const res = await fetch('/api/ai-stats/admin/vectors/flush', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Đã xóa sạch bộ nhớ Vector AI!')
        void fetchGlobalStats() // Refresh stats
      } else {
        const data = await res.json()
        toast.error(data.error || 'Lỗi khi xóa vector')
      }
    } catch (e) {
      toast.error('Lỗi kết nối server')
    } finally {
      setFlushing(false)
    }
  }

  const handleSyncMode = async (ctx: string, vec: string) => {
    if (ctx === 'all' && vec === 'all') setSyncingFull(true)
    else setSyncingIncremental(true)

    const fullRebuild = ctx === 'all' || vec === 'all'
    const promise = fetch(`/api/admin/sync-ai?fullRebuild=${fullRebuild}`, { method: 'POST' }).then(async res => {
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
      loading: `Đang khởi tạo đồng bộ (${ctx}/${vec})...`,
      success: (data: any) => `Đã bắt đầu xử lý cho ${data.queued_count} show chụp!`,
      error: (err) => err.message
    })
    
    promise.finally(() => {
      setSyncingFull(false)
      setSyncingIncremental(false)
    })
  }

  const handleTestCloudinary = async () => {
    setTestingCloudinary(true)
    try {
      const res = await fetch('/api/settings/cloudinary/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudinaryCloudName,
          cloudinaryApiKey,
          cloudinaryApiSecret,
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Cloudinary kết nối thành công!')
      } else {
        toast.error(data.error || 'Cloudinary test thất bại!')
      }
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setTestingCloudinary(false)
    }
  }

  if (loading) return <div className="p-8">Đang tải cấu hình...</div>

  const handleAddCloudinaryAccount = async () => {
    setSavingCloudinaryAccount(true)
    try {
      const res = await fetch('/api/settings/cloudinary/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: cloudinaryCloudName,
          cloudinaryCloudName,
          cloudinaryApiKey,
          cloudinaryApiSecret,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.migrationRequired) {
          toast.error('Chưa tạo bảng CloudinaryAccount. Hãy chạy Prisma migration rồi thử lại.')
          return
        }
        toast.error(data.error || 'Không thể thêm Cloudinary')
        return
      }

      setCloudinaryAccounts((items) => [...items, data.account])
      setCloudinaryCloudName('')
      setCloudinaryApiKey('')
      setCloudinaryApiSecret('')
      toast.success('Đã thêm Cloudinary vào pool')
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setSavingCloudinaryAccount(false)
    }
  }

  const handleToggleCloudinaryAccount = async (account: CloudinaryAccountItem) => {
    const res = await fetch('/api/settings/cloudinary/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.id, enabled: !account.enabled }),
    })
    if (res.ok) {
      const data = await res.json()
      setCloudinaryAccounts((items) => items.map((item) => item.id === account.id ? data.account : item))
    } else {
      const data = await res.json().catch(() => null)
      if (data?.migrationRequired) {
        toast.error('Chưa tạo bảng CloudinaryAccount. Hãy chạy Prisma migration rồi thử lại.')
        return
      }
      toast.error('Không thể cập nhật Cloudinary')
    }
  }

  const handleDeleteCloudinaryAccount = async (account: CloudinaryAccountItem) => {
    const res = await fetch('/api/settings/cloudinary/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.id }),
    })
    if (res.ok) {
      setCloudinaryAccounts((items) => items.filter((item) => item.id !== account.id))
      toast.success('Đã xoá Cloudinary khỏi pool')
    } else {
      const data = await res.json().catch(() => null)
      if (data?.migrationRequired) {
        toast.error('Chưa tạo bảng CloudinaryAccount. Hãy chạy Prisma migration rồi thử lại.')
        return
      }
      toast.error('Không thể xoá Cloudinary')
    }
  }

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
                
                <div className="space-y-6 pt-4 border-t">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-primary">Cấu hình đăng nhập & gửi mail</h3>
                      <p className="text-xs text-muted-foreground">
                        Các key này do Admin quản lý chung để bật đăng nhập Google và gửi email hệ thống cho studio.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowAdminIntegrationSecrets(value => !value)}
                    >
                      {showAdminIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showAdminIntegrationSecrets ? 'Ẩn key' : 'Hiện key'}
                    </Button>
                  </div>

                  <section className="space-y-4 rounded-lg border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <KeyRound className="h-4 w-4 text-blue-600" />
                          Cấu hình Google OAuth để đăng nhập
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dùng OAuth Client ID và Client Secret của Google Cloud Console để bật nút đăng nhập Google.
                        </p>
                      </div>
                      <Switch checked={googleEnabled} onCheckedChange={setGoogleEnabled} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="admin-google-client-id">Google OAuth Client ID</Label>
                        <Input
                          id="admin-google-client-id"
                          value={googleOauthClientId}
                          onChange={(event) => setGoogleOauthClientId(event.target.value)}
                          placeholder="1234567890-abc.apps.googleusercontent.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin-google-client-secret">Google OAuth Client Secret</Label>
                        <Input
                          id="admin-google-client-secret"
                          type={showAdminIntegrationSecrets ? 'text' : 'password'}
                          value={googleOauthClientSecret}
                          onChange={(event) => setGoogleOauthClientSecret(event.target.value)}
                          placeholder="GOCSPX-..."
                        />
                      </div>
                      <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="admin-google-redirect-uri">Authorized redirect URI cần thêm trong Google</Label>
                        <Input id="admin-google-redirect-uri" value={googleRedirectUri} readOnly />
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Sau khi lưu, nút Google ở trang đăng nhập sẽ bật ngay nếu đủ Client ID và Client Secret.
                    </p>
                  </section>

                  <section className="space-y-4 rounded-lg border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <Mail className="h-4 w-4 text-purple-600" />
                          Cấu hình Resend để gửi mail cho studio
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dùng cho email xác thực tài khoản, khôi phục mật khẩu, lời mời xem gallery và thông báo hệ thống.
                        </p>
                      </div>
                      <Switch checked={resendEnabled} onCheckedChange={setResendEnabled} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="admin-resend-api-key">Resend API Key</Label>
                        <Input
                          id="admin-resend-api-key"
                          type={showAdminIntegrationSecrets ? 'text' : 'password'}
                          value={resendApiKey}
                          onChange={(event) => setResendApiKey(event.target.value)}
                          placeholder="re_..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin-resend-from-email">Email người gửi</Label>
                        <Input
                          id="admin-resend-from-email"
                          value={resendFromEmail}
                          onChange={(event) => setResendFromEmail(event.target.value)}
                          placeholder="Studio Pro <hello@yourdomain.com>"
                        />
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Email người gửi phải thuộc domain đã verify trong Resend. Nếu bỏ trống, hệ thống dùng EMAIL_FROM trong .env.
                    </p>
                  </section>

                  <section className="space-y-4 rounded-lg border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <Send className="h-4 w-4 text-emerald-600" />
                          Telegram bot Studio Pro
                        </p>
                        <p className="text-xs text-muted-foreground">Một bot chung để gửi thông báo Telegram cho các studio.</p>
                      </div>
                      <Switch checked={telegramBotEnabled} onCheckedChange={setTelegramBotEnabled} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="admin-telegram-token">Bot Token</Label>
                        <Input
                          id="admin-telegram-token"
                          type={showAdminIntegrationSecrets ? 'text' : 'password'}
                          value={telegramBotToken}
                          onChange={(event) => setTelegramBotToken(event.target.value)}
                          placeholder="123456:ABC..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin-telegram-chat">Chat ID mặc định</Label>
                        <Input
                          id="admin-telegram-chat"
                          value={telegramDefaultChatId}
                          onChange={(event) => setTelegramDefaultChatId(event.target.value)}
                          placeholder="-1001234567890"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-primary">Cấu hình AI VLM (Trình phân tích ảnh)</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nguồn AI (Provider)</Label>
                      <select 
                        className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                        value={vlmProvider}
                        onChange={(e) => setVlmProvider(e.target.value)}
                      >
                        <option value="gemini">Google Gemini (Mặc định)</option>
                        <option value="openai">OpenAI / GitHub Models (GPT-4o mini)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>API Key ({vlmProvider === 'gemini' ? 'Google' : 'GitHub/OpenAI'})</Label>
                      <Input 
                        type="password" 
                        placeholder="Nhập API Key..." 
                        value={vlmApiKey} 
                        onChange={(e) => setVlmApiKey(e.target.value)} 
                      />
                    </div>
                    {vlmProvider === 'openai' && (
                      <>
                        <div className="space-y-2">
                          <Label>Model ID</Label>
                          <Input 
                            placeholder="gpt-4o-mini" 
                            value={vlmModelId} 
                            onChange={(e) => setVlmModelId(e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>API Base URL</Label>
                          <Input 
                            placeholder="https://models.inference.ai.azure.com" 
                            value={vlmApiBase} 
                            onChange={(e) => setVlmApiBase(e.target.value)} 
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    * Nếu bạn dùng GitHub Models, hãy lấy Token tại GitHub Settings và chọn model gpt-4o-mini.
                  </p>
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
<div className="grid gap-4 sm:grid-cols-3 mb-4">
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
                         <span className="font-medium text-emerald-700">Ảnh đã embed (Qdrant)</span>
                         <span className="font-bold">{globalStats?.indexed_photos_qdrant_images ?? 0} / {globalStats?.total_photos ?? 0}</span>
                       </div>
                       <Progress value={globalStats?.percentage_qdrant ?? 0} className="h-2 bg-emerald-100" />
                       <p className="text-[10px] text-emerald-600 italic">Số ảnh duy nhất đã được embed vào Qdrant</p>
                    </div>

                    <div className="rounded-xl border bg-purple-50/50 p-4 space-y-2">
                       <div className="flex justify-between items-center text-sm">
                         <span className="font-medium text-purple-700">Tổng Vector Qdrant</span>
                         <span className="font-bold">{globalStats?.total_vectors_qdrant?.toLocaleString() ?? 0}</span>
                       </div>
                       <p className="text-[10px] text-purple-600 italic">Tổng số vector embedding trong Qdrant</p>
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

                <div className="space-y-6">
                  {/* Part 1: Full Flow */}
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-background p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-700">1. Full luồng (Đồng bộ toàn diện)</p>
                      <p className="text-xs text-muted-foreground">
                        Cập nhật thông minh: Đảm bảo tất cả ảnh có ngữ cảnh và đã được đẩy vào Qdrant.
                      </p>
                    </div>
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                      onClick={() => handleSyncMode('missing', 'all')}
                      disabled={syncingFull || syncingIncremental}
                    >
                      {syncingFull ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Bắt đầu đồng bộ tất cả
                    </Button>
                  </div>

                  {/* Part 2: Database Context */}
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-background p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-700">2. Database Context (Phân tích Gemini)</p>
                      <p className="text-xs text-muted-foreground">Chỉ tác động đến dữ liệu mô tả ảnh trong Postgres.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSyncMode('all', 'none')}
                        disabled={syncingFull || syncingIncremental}
                      >
                        Toàn bộ (Rebuild)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSyncMode('missing', 'none')}
                        disabled={syncingFull || syncingIncremental}
                      >
                        Cập nhật bổ sung
                      </Button>
                    </div>
                  </div>

                  {/* Part 3: Qdrant Vector */}
                  <div className="space-y-3 rounded-lg border border-emerald-200 bg-background p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-emerald-700">3. Qdrant Vector Store (Tìm kiếm AI)</p>
                      <p className="text-xs text-muted-foreground">Đẩy dữ liệu từ Postgres vào bộ nhớ Vector (Qdrant).</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-200 hover:bg-emerald-50"
                        onClick={() => handleSyncMode('none', 'all')}
                        disabled={syncingFull || syncingIncremental}
                      >
                        Toàn bộ (Embed all)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-200 hover:bg-emerald-50"
                        onClick={() => handleSyncMode('none', 'missing')}
                        disabled={syncingFull || syncingIncremental}
                      >
                        Cập nhật bổ sung
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Task Monitor */}
                {activeTasks.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-primary flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang xử lý {activeTasks.length} tác vụ...
                      </p>
                    </div>
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                      {activeTasks.map((task: any, idx: number) => (
                        <div key={`${task?.task_id ?? 'active'}-${idx}`} className="space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-medium truncate max-w-[200px]">Project: {task.task_id?.replace('index:', '') ?? 'N/A'}</span>
                            <span className="font-bold">{task.percentage ?? 0}% ({task.processed_count ?? 0}/{task.total_count ?? 0})</span>
                          </div>
                          <Progress value={task.percentage ?? 0} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-amber-200">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2"
                        disabled={flushing || syncingFull || syncingIncremental}
                      >
                        {flushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Xóa sạch bộ nhớ Vector AI (Qdrant)
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa sạch?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Hành động này sẽ xóa TOÀN BỘ các vector tìm kiếm trong Qdrant. Dữ liệu trong Postgres vẫn giữ nguyên.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleFlushVectors}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Xác nhận xóa sạch
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                <CardDescription>
                  Mỗi studio nên dùng Cloudinary riêng vì lượng ảnh rất lớn; dùng chung một tài khoản có thể làm server quá tải và ảnh hưởng tốc độ xử lý.
                </CardDescription>
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
            {isUsingSharedCloudinary && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-medium">Studio đang dùng chung Cloudinary của Admin</p>
                  <p className="text-xs leading-relaxed text-amber-800">
                    Hiện tài khoản của bạn đang lưu ảnh bằng Cloudinary dùng chung với các studio khác.
                    Bạn nên cấu hình Cloudinary riêng để có dung lượng độc lập, upload thoải mái hơn và tránh bị ảnh hưởng khi nhiều studio cùng sử dụng.
                  </p>
                </div>
              </div>
            )}
            {cloudinaryAccounts.length > 0 && (
              <div className="space-y-2">
                <Label>Cloudinary pool</Label>
                <div className="space-y-2">
                  {cloudinaryAccounts.map((account) => {
                    const remaining = Math.max(0, account.limitBytes - account.usedBytes)
                    return (
                      <div key={account.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{account.label || account.cloudName}</p>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{account.cloudName}</span>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {account.enabled ? 'Đang bật' : 'Đang tắt'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Đã dùng {formatBytes(account.usedBytes)} / {formatBytes(account.limitBytes)} · còn {formatBytes(remaining)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleToggleCloudinaryAccount(account)}>
                            {account.enabled ? 'Tắt' : 'Bật'}
                          </Button>
                          <Button type="button" variant="outline" size="icon" onClick={() => handleDeleteCloudinaryAccount(account)} aria-label="Xoá Cloudinary">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
                <div className="relative">
                  <Input
                    id="cloud-secret"
                    type={showCloudinarySecret ? 'text' : 'password'}
                    value={cloudinaryApiSecret}
                    onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                    placeholder="your_api_secret"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCloudinarySecret((value) => !value)}
                    aria-label={showCloudinarySecret ? 'Ẩn API Secret' : 'Hiện API Secret'}
                  >
                    {showCloudinarySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleTestCloudinary} disabled={testingCloudinary} className="gap-2">
              {testingCloudinary ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {testingCloudinary ? 'Đang test...' : 'Test Cloudinary'}
            </Button>
            <Button type="button" onClick={handleAddCloudinaryAccount} disabled={savingCloudinaryAccount} className="gap-2">
              {savingCloudinaryAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {savingCloudinaryAccount ? 'Đang thêm...' : 'Thêm vào Cloudinary pool'}
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

      <Dialog open={cloudinaryRequirementOpen} onOpenChange={setCloudinaryRequirementOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-2xl">Cần cấu hình Cloudinary riêng</DialogTitle>
            <DialogDescription className="space-y-3 text-base leading-relaxed">
              <span className="block">
                Trước khi tạo show chụp, studio cần dùng tài khoản Cloudinary riêng để lưu và xử lý ảnh.
              </span>
              <span className="block">
                Vì mỗi studio thường tải lên rất nhiều ảnh, việc dùng chung một tài khoản có thể làm server quá tải,
                ảnh hưởng tốc độ upload và trải nghiệm của khách hàng. Mong chủ studio thông cảm và cấu hình theo hướng dẫn bên dưới.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloudinaryRequirementOpen(false)}
            >
              Để tôi tự cấu hình
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCloudinaryRequirementOpen(false)
                setCloudinaryGuideOpen(true)
              }}
            >
              Xem hướng dẫn tạo Cloudinary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cloudinaryGuideOpen} onOpenChange={setCloudinaryGuideOpen}>
        <DialogContent className="max-h-[95vh] !w-[95vw] sm:!w-[92vw] lg:!w-[85vw] xl:!w-[1200px] !max-w-none sm:!max-w-none overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-2xl">Hướng dẫn tạo tài khoản Cloudinary</DialogTitle>
            <DialogDescription className="text-base">
              Làm theo bước 1 và 2 trước. Từ bước 3, chọn đúng phần ảnh theo giao diện Cloudinary bạn đang thấy tại{' '}
              <a
                href="https://cloudinary.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-primary underline-offset-4 hover:underline"
              >
                cloudinary.com
                <ExternalLink className="h-4 w-4" />
              </a>{' '}
              để tạo tài khoản bằng Google và lấy đủ API key cho studio. Vì mỗi studio thường xử lý rất nhiều ảnh,
              hệ thống cần tài khoản Cloudinary riêng để tránh quá tải server và giữ tốc độ ổn định. Mong chủ studio thông cảm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                step: 1,
                title: 'Mở trang đăng ký',
                desc: 'Vào Cloudinary và nhấn Get Started để bắt đầu tạo tài khoản miễn phí.',
                src: '/cloudinary_setup/b1.png',
                alt: 'Cloudinary Get Started'
              },
              {
                step: 2,
                title: 'Đăng ký bằng Google',
                desc: 'Chọn Sign up with Google để tạo tài khoản nhanh. Sau khi đăng ký xong, bạn sẽ được đưa vào dashboard Cloudinary.',
                src: '/cloudinary_setup/b2.png',
                alt: 'Cloudinary đăng ký bằng Google'
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
              </div>
            ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              {[
                {
                  label: 'Giao diện mới',
                  steps: [
                    {
                      step: 3,
                      title: 'Mở API Keys',
                      desc: 'Nếu bạn thấy giao diện mới, nhấn API Keys ở thanh trên của Quick Start để mở trang quản lý key.',
                      src: '/cloudinary_setup/b3_new.png',
                      alt: 'Cloudinary giao diện mới mở API Keys'
                    },
                    {
                      step: 4,
                      title: 'Sao chép thông tin API',
                      desc: 'Tại trang API Keys, sao chép Cloud name, API Key và API Secret rồi điền vào form Cloudinary trong hệ thống.',
                      src: '/cloudinary_setup/b4_new.png',
                      alt: 'Cloudinary giao diện mới sao chép Cloud name API Key API Secret'
                    }
                  ]
                },
                {
                  label: 'Giao diện cũ',
                  steps: [
                    {
                      step: 3,
                      title: 'Mở View API Keys',
                      desc: 'Nếu bạn thấy giao diện cũ, chọn Next.js rồi nhấn View API Keys ở phần Optimize and Transform.',
                      src: '/cloudinary_setup/b3_old.png',
                      alt: 'Cloudinary giao diện cũ nhấn View API Keys'
                    },
                    {
                      step: 4,
                      title: 'Lấy Product Environment Credentials',
                      desc: 'Trong hộp Product Environment Credentials, sao chép Cloud name, API key và API secret để điền vào hệ thống.',
                      src: '/cloudinary_setup/b4_old.png',
                      alt: 'Cloudinary giao diện cũ Product Environment Credentials'
                    }
                  ]
                }
              ].map((version) => (
                <section key={version.label} className="space-y-4 rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-primary">{version.label}</h3>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Bước 3-4
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {version.steps.map((item) => (
                      <div key={`${version.label}-${item.step}`} className="space-y-4 rounded-xl border bg-muted/30 p-5 transition-colors hover:bg-muted/50">
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
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-normal text-amber-900">
              <span className="font-bold">Lưu ý:</span> API Secret có thể bị ẩn mặc định. Nếu chưa thấy đầy đủ API Secret, hãy nhấn biểu tượng con mắt trước khi sao chép.
            </div>
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
