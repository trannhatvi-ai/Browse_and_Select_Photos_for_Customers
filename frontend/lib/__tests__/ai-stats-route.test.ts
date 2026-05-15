import { NextRequest } from 'next/server'
import { GET } from '../../app/api/ai-stats/[...path]/route'

describe('GET /api/ai-stats/[...path]', () => {
  const originalFetch = global.fetch
  const originalSetTimeout = global.setTimeout
  const originalEnv = process.env
  const originalConsoleError = console.error

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as jest.Mock
    global.setTimeout = ((callback: TimerHandler) => {
      if (typeof callback === 'function') callback()
      return 0 as any
    }) as typeof global.setTimeout
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_AI_BACKEND_URL
    delete process.env.AI_BACKEND_URL
    delete process.env.BACKEND_URL
    delete process.env.NEXT_PUBLIC_BACKEND_URL
    console.error = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.setTimeout = originalSetTimeout
    process.env = originalEnv
    console.error = originalConsoleError
  })

  function request(path = 'admin/stats/global') {
    return new NextRequest(`http://localhost:3000/api/ai-stats/${path}`)
  }

  it('uses the shared backend URL env precedence', async () => {
    process.env.AI_BACKEND_URL = 'http://backend.internal:9000'
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ total_photos: 10 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await GET(request(), {
      params: Promise.resolve({ path: ['admin', 'stats', 'global'] }),
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.internal:9000/admin/stats/global',
      expect.any(Object)
    )
  })

  it('retries temporary connection failures while the backend is warming up', async () => {
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ total_photos: 10 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

    const response = await GET(request(), {
      params: Promise.resolve({ path: ['admin', 'stats', 'global'] }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ total_photos: 10 })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
