import { middleware } from './middleware'
import { NextRequest } from 'next/server'

// Mock getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from 'next-auth'

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('allows API requests through', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await middleware(request)
    expect(response.status).toBe(200) // next() returns 200 OK
  })

  it('blocks dashboard access when not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const request = new NextRequest('http://localhost:3000/dashboard')
    const response = await middleware(request)
    expect(response.status).toBe(401)
  })

  it('allows dashboard access when authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '1', email: 'admin@example.com', role: 'STUDIO' },
    })
    const request = new NextRequest('http://localhost:3000/dashboard')
    const response = await middleware(request)
    expect(response.status).toBe(200)
  })
})
