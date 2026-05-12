'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { formatVietnamPhoneForDisplay } from '@/lib/phone-format'
import { normalizeCallbackUrl } from '@/lib/callback-url'

type ProfileDefaults = {
  email: string
  emailVerified: boolean
  username: string
  name: string
  phone: string | null
  phoneVerified: boolean
  studioName: string
}

function CompleteProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = normalizeCallbackUrl(searchParams.get('callbackUrl'))
  const [defaults, setDefaults] = useState<ProfileDefaults | null>(null)
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [studioName, setStudioName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    async function loadProfile() {
      try {
        const response = await fetch('/api/auth/complete-profile', { cache: 'no-store' })
        const body = await response.json()
        if (!alive) return
        if (!response.ok) {
          setError(body.error || 'Không thể tải hồ sơ')
          return
        }
        setDefaults(body)
        setUsername(body.username || '')
        setName(body.name || '')
        setStudioName(body.studioName || '')
        setPhone(formatVietnamPhoneForDisplay(body.phone))
      } catch {
        if (alive) setError('Không thể kết nối máy chủ')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadProfile()
    return () => {
      alive = false
    }
  }, [])

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, studioName, password, phone }),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Không thể cập nhật hồ sơ')
        return
      }
      await fetch('/api/auth/session', { cache: 'no-store' })
      router.replace(callbackUrl)
      router.refresh()
    } catch {
      setError('Không thể kết nối máy chủ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
            <UserRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">Hoàn tất hồ sơ studio</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Email social đã xác thực. Cập nhật thông tin còn lại để bảo vệ tài khoản và vào dashboard.
          </p>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" aria-hidden="true" />
          </div>
        ) : (
          <form onSubmit={submitProfile} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-200" htmlFor="email">Email</label>
              <input
                id="email"
                value={defaults?.email || ''}
                readOnly
                className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-zinc-300 outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className={`text-xs ${defaults?.emailVerified ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {defaults?.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                </p>
                {!defaults?.emailVerified && <span className="text-xs text-zinc-400">Xác thực trong phần cài đặt sau khi vào dashboard.</span>}
              </div>
            </div>

            <label className="block text-sm font-medium text-zinc-200" htmlFor="username">
              Username
              <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 outline-none" />
            </label>
            <label className="block text-sm font-medium text-zinc-200" htmlFor="name">
              Tên hiển thị
              <input id="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 outline-none" />
            </label>
            <label className="block text-sm font-medium text-zinc-200 sm:col-span-2" htmlFor="studio-name">
              Tên studio
              <input id="studio-name" value={studioName} onChange={(event) => setStudioName(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 outline-none" />
            </label>
            <label className="block text-sm font-medium text-zinc-200" htmlFor="password">
              Mật khẩu
              <input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 outline-none" />
            </label>
            <label className="block text-sm font-medium text-zinc-200" htmlFor="confirm-password">
              Nhập lại mật khẩu
              <input id="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 outline-none" />
            </label>
            <label className="block text-sm font-medium text-zinc-200 sm:col-span-2" htmlFor="phone">
              Số điện thoại
              <input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="090 123 4567" className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 outline-none placeholder:text-zinc-500" autoComplete="tel" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className={`text-xs ${defaults?.phoneVerified ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {defaults?.phoneVerified ? 'Số điện thoại đã xác thực' : 'Số điện thoại chưa xác thực'}
                </p>
                {!defaults?.phoneVerified && <span className="text-xs text-zinc-400">Xác thực trong phần cài đặt sau khi vào dashboard.</span>}
              </div>
            </label>
            {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              Lưu
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-8 flex h-10 items-center justify-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Đăng nhập bằng tài khoản khác
        </button>
      </div>
    </main>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      <CompleteProfileContent />
    </Suspense>
  )
}
