import { POST } from '../../app/api/search/semantic/route'

describe('POST /api/search/semantic', () => {
  const originalFetch = global.fetch
  const originalConsoleError = console.error

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn() as jest.Mock
    console.error = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    console.error = originalConsoleError
  })

  function request() {
    return new Request('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ project_id: 'project-1', query: 'bride', top_k: 5 }),
      headers: { 'Content-Type': 'application/json' },
    }) as any
  }

  it('preserves backend error status when the backend returns non-JSON text', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response('model failed to load', { status: 500 })
    )

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'Semantic search backend returned an error.',
      detail: 'model failed to load',
    })
  })

  it('returns 502 only when the backend cannot be reached', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toBe('connect ECONNREFUSED')
  })
})
