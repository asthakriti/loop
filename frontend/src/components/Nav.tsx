import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { getMe } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { useProgress } from '../state/ProgressContext'
import { LoopLogo } from './LoopLogo'

export const NAV_LINKS = [
  { to: '/', label: 'Today' },
  { to: '/problems', label: 'My problems' },
  { to: '/bank', label: 'Problem bank' },
  { to: '/patterns', label: 'Patterns' },
  { to: '/settings', label: 'Settings' },
]

export function Nav() {
  const { logout } = useAuth()
  const { progress } = useProgress()
  const [email, setEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    getMe().then((u) => setEmail(u.email)).catch(() => setEmail(''))
  }, [])

  return (
    <header className="border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 md:gap-6" aria-label="Main">
        <Link to="/" aria-label="Loop home">
          <LoopLogo />
        </Link>

        {/* On phones these links move to a bottom tab bar (Feature 15). */}
        <ul className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-btn px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-full border border-border-strong bg-surface px-3 py-1.5 font-mono text-sm text-lavender">
            {progress ? `${progress.total_xp} XP` : '…'}
          </span>

          <div className="relative">
            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-full border border-border-strong bg-surface-2 font-heading font-semibold uppercase"
            >
              {email ? email[0] : '?'}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-13 z-10 w-56 rounded-btn border border-border-strong bg-surface p-2 shadow-xl">
                <p className="truncate px-2 py-1.5 text-sm text-muted">{email}</p>
                {/* On phones the bottom tabs have no Problem bank tab, so it lives here. */}
                <Link
                  to="/bank"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-surface-2 md:hidden"
                >
                  Problem bank
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
