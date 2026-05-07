import { NextRequest, NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/backend-api'

export async function POST(request: NextRequest) {
  const payload = await request.json()

  try {
    const backendResponse = await fetch(buildBackendUrl('/search/semantic'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const text = await backendResponse.text()
    const data = text ? JSON.parse(text) : null
    return NextResponse.json(data, { status: backendResponse.status })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to reach semantic search backend' },
      { status: 502 }
    )
  }
}
