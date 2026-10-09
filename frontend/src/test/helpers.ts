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
