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
  console.log(`[AI Proxy] ${method} -> ${targetUrl}`)

  try {
    let body: any = undefined
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = JSON.stringify(await request.json())
      } catch (e) {
        // No body or invalid JSON
      }
    }

    const res = await fetch(targetUrl, {
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
