import { NextRequest, NextResponse } from 'next/server'

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

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  const path = params.path.join('/')
  const searchParams = request.nextUrl.searchParams.toString()
  const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://127.0.0.1:8000'
  
  const targetUrl = `${backendUrl}/${path}${searchParams ? `?${searchParams}` : ''}`
  
  try {
    const res = await fetch(targetUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      // Với POST, chúng ta không dùng cache
      next: method === 'GET' ? { revalidate: 0 } : undefined
    })
    
    if (!res.ok) {
      let errorDetail = 'Failed to fetch from AI backend'
      try {
        const errorData = await res.json()
        errorDetail = errorData.detail || errorData.error || errorDetail
      } catch {}
      return NextResponse.json({ error: errorDetail }, { status: res.status })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`AI Proxy ${method} Error:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
