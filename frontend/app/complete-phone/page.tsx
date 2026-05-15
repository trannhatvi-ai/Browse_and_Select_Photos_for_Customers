'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, LogOut, Phone, ShieldCheck } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { normalizeCallbackUrl } from '@/lib/callback-url'
import { StudioLogoMark } from '@/components/studio-logo'

function CompletePhoneContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = normalizeCallbackUrl(searchParams.get('callbackUrl'))
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/complete-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const body = await response.json()

      if (!response.ok) {
        setError(body.error || 'Không thể gửi mã xác thực')
        return
      }

      setSent(true)
      setDevCode(body.devCode || null)
    } catch {
      setError('Không thể kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/complete-phone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = await response.json()

      if (!response.ok) {
        setError(body.error || 'Không thể xác thực số điện thoại')
        return
      }

      await fetch('/api/auth/session', { cache: 'no-store' })
      router.replace(callbackUrl)
      router.refresh()
    } catch {
      setError('Không thể kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8">
          <StudioLogoMark className="mb-4 h-12 w-12 rounded-xl ring-white/10" priority sizes="48px" />
          <h1 className="text-3xl font-semibold tracking-normal">Xác thực số điện thoại</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Mỗi tài khoản cần một số điện thoại Việt Nam duy nhất trước khi vào dashboard.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={submitPhone} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-200" htmlFor="phone">
              Số điện thoại
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3">
              <Phone className="h-5 w-5 text-zinc-400" aria-hidden="true" />
              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="090 123 4567"
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-500"
                autoComplete="tel"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              Gửi mã xác thực
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-200" htmlFor="code">
              Mã xác thực
            </label>
            <input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-center text-xl outline-none placeholder:text-zinc-600"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
            />
            {devCode && <p className="text-sm text-zinc-300">Dev code: {devCode}</p>}
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              Xác thực và tiếp tục
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setCode('')
                setError('')
              }}
              className="h-10 w-full rounded-lg border border-zinc-700 text-sm text-zinc-200 transition hover:bg-zinc-900"
            >
              Đổi số điện thoại
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

export default function CompletePhonePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      <CompletePhoneContent />
    </Suspense>
  )
}
