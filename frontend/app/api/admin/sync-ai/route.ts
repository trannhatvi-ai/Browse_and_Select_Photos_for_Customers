import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  const session = await getServerSession(authOptions)
  
  // Chỉ cho phép Admin truy cập
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
  }

  try {
    const aiBackendUrl = process.env.AI_BACKEND_URL || 'http://localhost:8000'
    const res = await fetch(`${aiBackendUrl}/sync/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

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
