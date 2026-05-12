import { NextRequest } from 'next/server'
import { proxy } from '../../proxy'
import { getToken } from 'next-auth/jwt'

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

describe('Auth Proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('allows auth routes through', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session')
    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(getToken).not.toHaveBeenCalled()
  })

  it('redirects dashboard access when not authenticated', async () => {
    ;(getToken as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/dashboard')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?callbackUrl=%2Fdashboard'
    )
  })

  it('allows dashboard access when authenticated', async () => {
    ;(getToken as jest.Mock).mockResolvedValue({
      role: 'STUDIO',
      phone: '+84901234567',
      phoneVerifiedAt: '2026-05-12T00:00:00.000Z',
      profileComplete: true,
    })

    const request = new NextRequest('http://localhost:3000/dashboard')
    const response = await proxy(request)

    expect(response.status).toBe(200)
  })

  it('redirects authenticated users to complete profile first', async () => {
    ;(getToken as jest.Mock).mockResolvedValue({ role: 'STUDIO' })

    const request = new NextRequest('http://localhost:3000/dashboard/projects')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/complete-profile?callbackUrl=%2Fdashboard%2Fprojects'
    )
  })

  it('redirects non-admin users away from user management', async () => {
    ;(getToken as jest.Mock).mockResolvedValue({
      role: 'STUDIO',
      phone: '+84901234567',
      phoneVerifiedAt: '2026-05-12T00:00:00.000Z',
      profileComplete: true,
    })

    const request = new NextRequest('http://localhost:3000/dashboard/users')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })
})
