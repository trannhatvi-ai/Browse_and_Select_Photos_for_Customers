import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { queueEmail } from '@/lib/email'

// GET /api/projects — list all projects (optionally filter by status)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as any

  const where = status ? { status } : {}

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      eventName: true,
      eventDate: true,
      status: true,
      deadline: true,
      photoCount: true,
      selectedCount: true,
      maxSelections: true,
      createdAt: true,
    },
  })

  return NextResponse.json(projects)
}

// POST /api/projects — create new project
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    clientName,
    clientEmail,
    eventName,
    eventDate,
    deadline,
    maxSelections = 50,
    status = 'UPLOADING',
    watermarkConfig,
  } = body

  if (!clientName || !clientEmail || !eventName || !eventDate || !deadline) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Generate access token for client
  const accessToken = Math.random().toString(36).substring(2, 15)

  const project = await prisma.project.create({
    data: {
      clientName,
      clientEmail,
      eventName,
      eventDate: new Date(eventDate),
      deadline: new Date(deadline),
      maxSelections,
      status,
      accessToken,
      createdBy: session.user.id,
      watermarkConfig,
    },
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      eventName: true,
      eventDate: true,
      status: true,
      deadline: true,
      maxSelections: true,
      accessToken: true,
      createdAt: true,
    },
  })

  // Queue invitation email
  try {
    const galleryLink = `${process.env.NEXT_PUBLIC_APP_URL}/gallery/${accessToken}`
    await queueEmail({
      to: clientEmail,
      subject: `Your photos are ready: ${eventName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Geist, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your photos are ready!</h2>
            <p>Hi ${clientName},</p>
            <p>Your <strong>${eventName}</strong> photos are ready for your review.</p>
            <p><a href="${galleryLink}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Gallery</a></p>
            ${watermarkConfig?.password ? `<p><strong>Password:</strong> ${watermarkConfig.password}</p>` : ''}
            <p>Deadline: ${new Date(deadline).toLocaleDateString()}</p>
            <p>Max selections: ${maxSelections}</p>
          </body>
        </html>
      `,
    })
  } catch (err) {
    console.error('Failed to queue invitation email:', err)
    // Don't fail creation if email fails
  }

  return NextResponse.json(project, { status: 201 })
}
