import { NextRequest, NextResponse } from 'next/server'
import { buildBackendUrl } from '@/lib/backend-api'

const RETRY_DELAYS_MS = [250, 750, 1500, 3000]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetriableConnectionError(error: any) {
  const message = String(error?.message || error || '')
  return (
    error instanceof TypeError ||
    /fetch failed|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ETIMEDOUT/i.test(message)
  )
}

async function fetchBackend(
  targetUrl: string,
  init: RequestInit & { next?: { revalidate: number } }
) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetch(targetUrl, init)
    } catch (error) {
      if (attempt === RETRY_DELAYS_MS.length || !isRetriableConnectionError(error)) {
        throw error
      }

      console.warn(
        `[AI Proxy] Backend not ready, retrying ${attempt + 1}/${RETRY_DELAYS_MS.length}`
      )
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }

  throw new Error('Unable to reach AI Backend')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, await params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, await params, 'POST')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, await params, 'DELETE')
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  const path = params.path.join('/')
  const searchParams = request.nextUrl.searchParams.toString()
  const targetUrl = buildBackendUrl(`/${path}${searchParams ? `?${searchParams}` : ''}`)
  console.log(`[AI Proxy] ${method} -> ${targetUrl}`)

  try {
    let body: any = undefined
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = JSON.stringify(await request.json())
      } catch {
        // No body or invalid JSON
      }
    }

    const res = await fetchBackend(targetUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
      next: method === 'GET' ? { revalidate: 0 } : undefined
    })
    
    const contentType = res.headers.get('content-type')
    
    if (!res.ok) {
      let errorDetail = `Backend returned ${res.status}`
      if (contentType?.includes('application/json')) {
        const errorData = await res.json()
        errorDetail = errorData.detail || errorData.error || errorDetail
      } else {
        errorDetail = await res.text()
      }
      console.warn(`[AI Proxy] Backend Error (${res.status}):`, errorDetail.slice(0, 200))
      return NextResponse.json({ error: errorDetail }, { status: res.status })
    }
    
    if (contentType?.includes('application/json')) {
      const data = await res.json()
      return NextResponse.json(data)
    } else {
      const text = await res.text()
      return new NextResponse(text, { status: 200, headers: { 'Content-Type': contentType || 'text/plain' } })
    }
  } catch (error: any) {
    console.error(`[AI Proxy] ${method} Connection Error:`, error.message)
    return NextResponse.json({ 
      error: 'Could not connect to AI Backend', 
      details: error.message,
      target: targetUrl 
    }, { status: 502 })
  }
}
