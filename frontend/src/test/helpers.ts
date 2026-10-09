import { vi } from 'vitest'

// Make fetch return these responses, one per call, in order.
export function mockFetch(...responses: { status: number; body?: unknown }[]) {
  const fetchMock = vi.fn()
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(r.body === undefined ? null : JSON.stringify(r.body), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

type Reply = { status?: number; body?: unknown }
type Handler = Reply | ((url: URL, init: RequestInit) => Reply)

// A fake API: keys look like "GET /today" or "POST /my/problems". The query string is ignored
// in the key, but handlers get the full URL so they can read it.
export function mockRoutes(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input)
    const key = `${init.method ?? 'GET'} ${url.pathname}`
    const handler = routes[key]
    if (!handler) return new Response(JSON.stringify({ detail: `No mock for ${key}` }), { status: 404 })
    const reply = typeof handler === 'function' ? handler(url, init) : handler
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** All calls as "METHOD /path?query". */
export function calls(fetchMock: { mock: { calls: unknown[][] } }): string[] {
  return fetchMock.mock.calls.map(([input, init]) => {
    const url = new URL(input as string)
    return `${(init as RequestInit | undefined)?.method ?? 'GET'} ${url.pathname}${url.search}`
  })
}
