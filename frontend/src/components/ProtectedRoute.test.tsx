import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { setToken } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Secret today page</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('sends a logged-out user to /login', () => {
    renderAt('/')
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret today page')).not.toBeInTheDocument()
  })

  it('shows the page to a logged-in user', () => {
    setToken('abc')
    renderAt('/')
    expect(screen.getByText('Secret today page')).toBeInTheDocument()
  })
})
