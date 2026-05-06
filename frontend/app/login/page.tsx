'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Lock, Mail, Phone, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)
  const [forgotMethod, setForgotMethod] = useState<'email' | 'phone'>('email')
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'register' || tab === 'forgot' || tab === 'login') {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      identifier: loginIdentifier,
      password: loginPassword,
      redirect: false,
    })

    if (res?.error) {
      setError('Thông tin đăng nhập không chính xác')
      setLoading(false)
      return
    }

    router.push(callbackUrl)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          username: registerUsername,
          phone: registerPhone,
          email: registerEmail,
          password: registerPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tạo tài khoản')
      }

      toast.success('Đã tạo tài khoản chủ studio. Bạn có thể đăng nhập ngay.')
      setLoginIdentifier(registerEmail)
      setLoginPassword('')
      setActiveTab('login')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: forgotMethod, identifier: forgotIdentifier }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi yêu cầu khôi phục mật khẩu')
      }

      toast.success('Nếu tài khoản tồn tại, một email khôi phục đã được gửi.')
      if (data.resetUrl) {
        toast.success('Môi trường dev: đã tạo link khôi phục, mở từ response để test.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(235,240,245,0.9)_45%,rgba(224,228,235,0.95))] px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border bg-background/80 p-8 shadow-2xl shadow-black/5 backdrop-blur">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Studio Pro</p>
              <h1 className="text-2xl font-semibold">Quản trị dashboard</h1>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register">Tạo tài khoản</TabsTrigger>
              <TabsTrigger value="forgot">Quên mật khẩu</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">Email / Username / Số điện thoại</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="admin, username hoặc 090..."
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'} <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="register-name">Tên chủ studio</Label>
                    <Input id="register-name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Nguyễn Văn A" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input id="register-username" value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} placeholder="studio_a" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Số điện thoại</Label>
                    <Input id="register-phone" value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} placeholder="0901234567" required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input id="register-email" type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="email@example.com" required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="register-password">Mật khẩu</Label>
                    <Input id="register-password" type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={registerLoading}>
                  <UserPlus className="h-4 w-4" />
                  {registerLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản chủ studio'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot" className="mt-6">
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label>Chọn cách lấy lại mật khẩu</Label>
                  <Select value={forgotMethod} onValueChange={(value) => setForgotMethod(value as 'email' | 'phone')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Bằng email</SelectItem>
                      <SelectItem value="phone">Bằng số điện thoại</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-identifier">{forgotMethod === 'email' ? 'Email' : 'Số điện thoại'}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-identifier"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder={forgotMethod === 'email' ? 'email@example.com' : '0901234567'}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? 'Đang xử lý...' : 'Gửi link khôi phục'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Hệ thống sẽ tra tài khoản theo thông tin bạn nhập và gửi link đặt lại mật khẩu qua email liên kết.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:flex rounded-3xl border bg-[linear-gradient(160deg,#111827,#1f2937_55%,#374151)] p-8 text-white shadow-2xl shadow-black/20">
          <div className="mt-auto max-w-md space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Photo Proofing Studio</p>
            <h2 className="text-4xl font-semibold leading-tight">Một dashboard cho admin, một dashboard cho studio, đúng quyền, đúng dữ liệu.</h2>
            <p className="text-white/75">
              Đăng nhập bằng email, username hoặc số điện thoại. Studio tự tạo tài khoản, admin quản lý người dùng và cấu hình riêng.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
