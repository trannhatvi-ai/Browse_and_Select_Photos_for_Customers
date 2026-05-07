"use client"

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LoginClient() {
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
  const [showPassword, setShowPassword] = useState(false)
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')

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
    if (registerPassword !== registerConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      setRegisterLoading(false)
      return
    }

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
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="px-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                    <Input id="register-phone" value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} placeholder="090..." required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input id="register-email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="email@studio.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Mật khẩu</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Xác nhận mật khẩu</Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={registerLoading}>{registerLoading ? 'Đang tạo...' : 'Tạo tài khoản'}</Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot" className="mt-6">
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Phương thức</Label>
                  <Select onValueChange={(v) => setForgotMethod(v as 'email' | 'phone')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Số điện thoại</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-identifier">Email hoặc số điện thoại</Label>
                  <Input id="forgot-identifier" value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:block">
          {/* Right side static illustration or info could go here */}
        </div>
      </div>
    </div>
  )
}
