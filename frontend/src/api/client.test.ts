import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '../test/helpers'
import { api, ApiError, getToken, onUnauthorized, setToken } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  onUnauthorized(null)
})

describe('api client', () => {
  it('sends the token as a Bearer header', async () => {
    setToken('abc123')
    const fetchMock = mockFetch({ status: 200, body: { ok: true } })
    await api('/auth/me')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8000/auth/me')
    expect(init.headers.Authorization).toBe('Bearer abc123')
  })

  it('sends no Authorization header when logged out', async () => {
    const fetchMock = mockFetch({ status: 200, body: {} })
    await api('/health')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('sends a JSON body', async () => {
    const fetchMock = mockFetch({ status: 200, body: {} })
    await api('/auth/login', { method: 'POST', body: { email: 'a@b.com' } })
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"email":"a@b.com"}')
  })

  it('logs out when the token has expired (401)', async () => {
    setToken('old-token')
    const handler = vi.fn()
    onUnauthorized(handler)
    mockFetch({ status: 401, body: { detail: 'Not logged in or token expired' } })
    await expect(api('/today')).rejects.toBeInstanceOf(ApiError)
    expect(getToken()).toBeNull()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not log out on a 401 without a token (wrong password)', async () => {
    const handler = vi.fn()
    onUnauthorized(handler)
    mockFetch({ status: 401, body: { detail: 'Wrong email or password' } })
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toThrow('Wrong email or password')
    expect(handler).not.toHaveBeenCalled()
  })

  it('reads FastAPI validation errors', async () => {
    mockFetch({ status: 422, body: { detail: [{ msg: 'String should have at least 8 characters' }] } })
    await expect(api('/auth/register', { method: 'POST', body: {} })).rejects.toThrow(
      'String should have at least 8 characters',
    )
  })

  it('returns undefined for 204 No Content', async () => {
    mockFetch({ status: 204 })
    await expect(api('/my/problems/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
