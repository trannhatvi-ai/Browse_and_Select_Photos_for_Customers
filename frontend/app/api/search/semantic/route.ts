import { NextRequest, NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/backend-api'

function parseBackendBody(text: string, fallbackError: string) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return {
      error: fallbackError,
      detail: text.slice(0, 1000),
    }
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json()

  try {
    const backendResponse = await fetch(buildBackendUrl('/search/semantic'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      next: { revalidate: 0 },
    })

    const text = await backendResponse.text()
    const data = parseBackendBody(
      text,
      backendResponse.ok
        ? 'Semantic search backend returned a non-JSON response.'
        : 'Semantic search backend returned an error.'
    )

    if (!backendResponse.ok) {
      console.error('Semantic search backend error:', {
        status: backendResponse.status,
        body: data,
      })
    }

    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to reach semantic search backend' },
      { status: 502 }
    )
  }
}
