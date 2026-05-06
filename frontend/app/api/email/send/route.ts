import { NextRequest, NextResponse } from 'next/server'
import { queueEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { to, subject, html, from } = body

  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    await queueEmail({ to, subject, html, from })
    return NextResponse.json({ success: true, queued: true })
  } catch (error) {
    console.error('Email queue error:', error)
    return NextResponse.json({ error: 'Failed to queue email' }, { status: 500 })
  }
}
