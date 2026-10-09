import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { clearToken, getToken, onUnauthorized, setToken } from '../api/client'

type AuthState = {
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())

  // If any API call finds the token expired, show the login page again.
  useEffect(() => {
    onUnauthorized(() => setTokenState(null))
    return () => onUnauthorized(null)
  }, [])

  async function login(email: string, password: string) {
    const { access_token } = await authApi.login(email, password)
    setToken(access_token)
    setTokenState(access_token)
  }

  async function register(email: string, password: string) {
    await authApi.register(email, password)
    await login(email, password)
  }

  function logout() {
    clearToken()
    setTokenState(null)
  }

  return <AuthContext.Provider value={{ token, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
