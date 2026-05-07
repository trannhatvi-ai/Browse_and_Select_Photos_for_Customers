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
      return NextResponse.json({ error: 'AI Backend returned an error' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Sync AI Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
