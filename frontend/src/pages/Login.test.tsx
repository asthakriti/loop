import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getToken } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { mockFetch } from '../test/helpers'
import { Login } from './Login'

afterEach(() => vi.unstubAllGlobals())

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>Today page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillForm(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
}

describe('Login page', () => {
  it('logs in, saves the token and opens Today', async () => {
    const fetchMock = mockFetch({ status: 200, body: { access_token: 'tok-1', token_type: 'bearer' } })
    renderLogin()
    await fillForm('me@example.com', 'strongpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Today page')).toBeInTheDocument()
    expect(getToken()).toBe('tok-1')
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/login')
  })

  it('shows the error for a wrong password', async () => {
    mockFetch({ status: 401, body: { detail: 'Wrong email or password' } })
    renderLogin()
    await fillForm('me@example.com', 'wrongpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password')
    expect(getToken()).toBeNull()
  })

  it('creates an account, then logs in', async () => {
    const fetchMock = mockFetch(
      { status: 201, body: { id: 1, email: 'new@example.com', created_at: '2026-01-01' } },
      { status: 200, body: { access_token: 'tok-2', token_type: 'bearer' } },
    )
    renderLogin()
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }))
    await fillForm('new@example.com', 'strongpass1')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Today page')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      'http://localhost:8000/auth/register',
      'http://localhost:8000/auth/login',
    ])
    expect(getToken()).toBe('tok-2')
  })
})
