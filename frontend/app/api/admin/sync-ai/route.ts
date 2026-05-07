import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBackendBaseUrl } from '@/lib/backend-api'

export async function POST() {
  const session = await getServerSession(authOptions)
  
  // Chỉ cho phép Admin truy cập
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
  }

  try {
    const aiBackendUrl = getBackendBaseUrl()
    const candidatePaths = ['/sync/all', '/api/sync/all']
    let res: Response | null = null
    let lastAttemptedUrl = ''

    for (const pathname of candidatePaths) {
      lastAttemptedUrl = new URL(pathname, aiBackendUrl).toString()
      res = await fetch(lastAttemptedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      if (res.ok || res.status !== 404) {
        break
      }
    }

    if (!res) {
      return NextResponse.json(
        { error: 'Unable to contact AI backend' },
        { status: 502 }
      )
    }

    if (!res.ok) {
      let backendError = 'AI backend returned an error'
      let backendDetails: unknown = null
      try {
        const errorPayload = await res.json()
        backendError = errorPayload?.error || errorPayload?.detail || backendError
        backendDetails = errorPayload
      } catch {
        try {
          const errorText = await res.text()
          if (errorText) backendError = errorText
        } catch {
          // Keep default message when backend response body cannot be parsed.
        }
      }

      return NextResponse.json(
        {
          error: backendError,
          upstream_status: res.status,
          attempted_url: lastAttemptedUrl,
          details: backendDetails
        },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Sync AI Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
