// One small fetch wrapper for every API call.
// It adds the JWT token and turns errors into readable messages.

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const TOKEN_KEY = 'loop_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage blocked: the user stays logged in until the tab closes
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing to clear
  }
}

// Called when the server says our token is no longer valid (expired).
let unauthorizedHandler: (() => void) | null = null
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') return data.detail
    // FastAPI validation errors: a list like [{ msg: "..." }]
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg
  } catch {
    // not JSON
  }
  return 'Something went wrong. Please try again.'
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown // sent as JSON
  formData?: FormData // sent as a file upload
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_URL}${path}`, { method: options.method ?? 'GET', headers, body })

  // Our token expired: log out. (A wrong password on login has no token, so it is not this case.)
  if (response.status === 401 && token) {
    clearToken()
    unauthorizedHandler?.()
  }
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
