import { api } from './client'

export type User = { id: number; email: string; created_at: string }

export function login(email: string, password: string) {
  return api<{ access_token: string; token_type: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function register(email: string, password: string) {
  return api<User>('/auth/register', { method: 'POST', body: { email, password } })
}

export function getMe() {
  return api<User>('/auth/me')
}
