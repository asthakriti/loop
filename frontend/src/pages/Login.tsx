import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoopLogo } from '../components/LoopLogo'

type Mode = 'login' | 'register'

export function Login() {
  const { token, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (token) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
      active ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
    }`

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LoopLogo />
          <p className="text-muted">You don&apos;t forget what you keep coming back to.</p>
        </div>

        <div className="rounded-card border border-border bg-surface p-6">
          <div role="tablist" aria-label="Log in or create an account" className="mb-6 flex gap-1 rounded-btn border border-border bg-bg p-1">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={tabClass(mode === 'login')} onClick={() => setMode('login')}>
              Log in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={tabClass(mode === 'register')} onClick={() => setMode('register')}>
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-btn border border-border-strong bg-bg px-3 text-text outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Password</span>
              <input
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-describedby={mode === 'register' ? 'password-hint' : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-btn border border-border-strong bg-bg px-3 text-text outline-none focus:border-accent"
              />
            </label>
            {mode === 'register' && (
              <p id="password-hint" className="-mt-2 text-xs text-muted">
                At least 8 characters.
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-11 rounded-btn bg-accent font-heading font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
