"use client"

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Lock, Mail, Eye, EyeOff, Sparkles, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { normalizeCallbackUrl } from '@/lib/callback-url'

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
  const [phoneResetPending, setPhoneResetPending] = useState(false)
  const [phoneResetIdentifier, setPhoneResetIdentifier] = useState('')
  const [phoneResetCode, setPhoneResetCode] = useState('')
  const [phoneResetPassword, setPhoneResetPassword] = useState('')
  const [phoneResetConfirmPassword, setPhoneResetConfirmPassword] = useState('')
  const [phoneResetLoading, setPhoneResetLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const [facebookAvailable, setFacebookAvailable] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = normalizeCallbackUrl(searchParams.get('callbackUrl'))

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'register' || tab === 'forgot' || tab === 'login') {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/auth/providers')
      .then(res => res.ok ? res.json() : {})
      .then((data: Record<string, unknown>) => {
        setGoogleAvailable(Boolean(data.google))
        setFacebookAvailable(Boolean(data.facebook))
      })
      .catch(() => {
        setGoogleAvailable(false)
        setFacebookAvailable(false)
      })
  }, [])

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

  const handleGoogleLogin = () => {
    void signIn('google', { callbackUrl })
  }

  const handleFacebookLogin = () => {
    void signIn('facebook', { callbackUrl })
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

      toast.success('Đã tạo tài khoản. Vui lòng nhập 2 mã xác thực đã gửi tới email và số điện thoại.')
      if (data.deliveryErrors?.length) {
        toast.warning('Một số kênh chưa gửi được mã. Bạn có thể bấm "Gửi lại mã" sau khi kiểm tra cấu hình email/SMS.')
      }
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

      if (forgotMethod === 'phone') {
        setPhoneResetPending(true)
        setPhoneResetIdentifier(forgotIdentifier)
        if (data.devCode) setPhoneResetCode(data.devCode)
        toast.success('Nếu số điện thoại đã xác thực, mã khôi phục đã được gửi.')
      } else {
        toast.success('Nếu tài khoản tồn tại, một email khôi phục đã được gửi.')
      }

      if (data.resetUrl) {
        toast.success('Môi trường dev: đã tạo link khôi phục, mở từ response để test.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setForgotLoading(false)
    }
  }

  const handlePhoneReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (phoneResetPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (phoneResetPassword !== phoneResetConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setPhoneResetLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneResetIdentifier,
          code: phoneResetCode,
          password: phoneResetPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể đổi mật khẩu')

      toast.success('Đã đổi mật khẩu. Hãy đăng nhập lại.')
      setLoginIdentifier(phoneResetIdentifier)
      setPhoneResetPending(false)
      setActiveTab('login')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPhoneResetLoading(false)
    }
  }

  const googleButtonTitle = googleAvailable
    ? 'Đăng nhập hoặc tạo tài khoản bằng Google'
    : 'Admin chưa cấu hình Google OAuth hoặc cấu hình chưa đủ Client ID và Client Secret.'

  const facebookButtonTitle = facebookAvailable
    ? 'Dang nhap hoac tao tai khoan bang Facebook'
    : 'Admin chua cau hinh Facebook OAuth hoac cau hinh chua du App ID va App Secret.'

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register">Tạo tài khoản</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleLogin}
                  disabled={!googleAvailable}
                  title={googleButtonTitle}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold">
                    G
                  </span>
                  Đăng nhập bằng Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleFacebookLogin}
                  disabled={!facebookAvailable}
                  title={facebookButtonTitle}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold">
                    f
                  </span>
                  Dang nhap bang Facebook
                </Button>
                {!googleAvailable && (
                  <p className="text-xs text-muted-foreground">
                    Google OAuth chưa được cấu hình trong trang cài đặt Admin.
                  </p>
                )}
                {!facebookAvailable && (
                  <p className="text-xs text-muted-foreground">
                    Facebook OAuth chua duoc cau hinh trong trang cai dat Admin.
                  </p>
                )}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">hoặc</span>
                  </div>
                </div>
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
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot')}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleLogin}
                  disabled={!googleAvailable}
                  title={googleButtonTitle}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold">
                    G
                  </span>
                  Tạo tài khoản bằng Google
                </Button>
                {!googleAvailable && (
                  <p className="text-xs text-muted-foreground">
                    Google OAuth chưa được cấu hình trong trang cài đặt Admin.
                  </p>
                )}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">hoặc</span>
                  </div>
                </div>
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
                  <Select value={forgotMethod} onValueChange={(v) => setForgotMethod(v as 'email' | 'phone')}>
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
                  <div className="relative">
                    {forgotMethod === 'phone' ? (
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input id="forgot-identifier" value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>{forgotLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}</Button>
              </form>
              {phoneResetPending && (
                <form onSubmit={handlePhoneReset} className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Đặt lại mật khẩu bằng mã điện thoại</p>
                    <p className="text-xs text-muted-foreground">Nhập mã đã gửi tới số điện thoại và mật khẩu mới.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-reset-code">Mã khôi phục</Label>
                    <Input id="phone-reset-code" inputMode="numeric" value={phoneResetCode} onChange={(e) => setPhoneResetCode(e.target.value)} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone-reset-password">Mật khẩu mới</Label>
                      <Input id="phone-reset-password" type="password" value={phoneResetPassword} onChange={(e) => setPhoneResetPassword(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone-reset-confirm-password">Nhập lại mật khẩu</Label>
                      <Input id="phone-reset-confirm-password" type="password" value={phoneResetConfirmPassword} onChange={(e) => setPhoneResetConfirmPassword(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={phoneResetLoading}>{phoneResetLoading ? 'Đang lưu...' : 'Đổi mật khẩu'}</Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:flex flex-col h-full rounded-3xl bg-white overflow-hidden relative group border border-slate-200">
          {/* Showcase background with infinite scroll - Light Theme */}
          <div className="absolute inset-0 z-0">
            <ShowcaseCarousel token="zehgnjymsk" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
          </div>

          <div className="relative z-10 mt-auto p-12 text-slate-900">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 backdrop-blur-xl border border-slate-200/50 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span>Giao diện thực tế: zehgnjymsk</span>
            </div>

            <h2 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900">
              Trải nghiệm <br />
              <span className="text-primary italic font-serif">chọn ảnh</span> đỉnh cao
            </h2>

            <p className="mb-10 text-lg text-slate-500 max-w-sm leading-relaxed font-light">
              Tối ưu hóa quy trình làm việc của Studio. Mang đến cho khách hàng của bạn một không gian chọn ảnh sang trọng và hiện đại.
            </p>

            <div className="flex flex-col gap-6">
              <Button
                onClick={() => window.open('/gallery/zehgnjymsk', '_blank')}
                className="w-fit h-14 px-10 rounded-full bg-slate-900 text-white hover:bg-slate-800 font-bold gap-3 transition-all active:scale-95 shadow-xl group/btn"
              >
                <Eye className="h-5 w-5 transition-transform group-hover/btn:scale-110" /> Khám phá Gallery Demo
              </Button>

              <div className="grid grid-cols-2 gap-10 border-t border-slate-100 pt-10 mt-2">
                <div className="space-y-1">
                  <div className="text-3xl font-black text-slate-900">10k+</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Ảnh đã xử lý</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-black text-slate-900">99%</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Hài lòng</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShowcaseCarousel({ token }: { token: string }) {
  const [photos, setPhotos] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/gallery/${token}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.photos) {
          setPhotos([...data.photos, ...data.photos])
        }
      })
      .catch(console.error)
  }, [token])

  if (photos.length === 0) return <div className="h-full w-full bg-slate-50 animate-pulse" />

  const col1 = photos.slice(0, Math.ceil(photos.length / 2))
  const col2 = photos.slice(Math.ceil(photos.length / 2))

  return (
    <div className="flex h-full gap-4 p-6 opacity-60 overflow-hidden">
      <style>{`
        @keyframes scroll-y {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-scroll-y {
          animation: scroll-y 60s linear infinite;
        }
        .animate-scroll-y-reverse {
          animation: scroll-y 75s linear infinite reverse;
        }
      `}</style>

      <div className="flex-1 flex flex-col gap-4 animate-scroll-y">
        {col1.map((p, i) => (
          <div key={`${p.id}-${i}`} className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-3xl shadow-sm border border-slate-100">
            <img src={p.previewUrl} className="h-full w-full object-cover" alt="" />
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-4 animate-scroll-y-reverse">
        {col2.map((p, i) => (
          <div key={`${p.id}-${i}`} className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-3xl shadow-sm border border-slate-100">
            <img src={p.previewUrl} className="h-full w-full object-cover" alt="" />
          </div>
        ))}
      </div>
    </div>
  )
}
