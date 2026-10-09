import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../api/client'
import { mockRoutes } from '../test/helpers'
import { Settings, validate } from './Settings'

const saved = { round_days: 30, max_daily: 10, new_per_day: 2, target_company: null }
const stats = { total_solved: 164, solved_per_pattern: [], round: { number: 1, revised: 0, total: 164 }, milestone: { target: 200, to_go: 36 } }

function renderPage() {
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  )
}

beforeEach(() => setToken('test-token'))
afterEach(() => vi.unstubAllGlobals())

describe('Settings page', () => {
  it('loads the saved values and shows problems per day', async () => {
    mockRoutes({ 'GET /settings': { body: saved }, 'GET /stats': { body: stats } })
    renderPage()
    expect(await screen.findByLabelText('Round length (days)')).toHaveValue(30)
    expect(screen.getByLabelText('Daily limit')).toHaveValue(10)
    expect(screen.getByLabelText('New problems per day')).toHaveValue(2)
    expect(screen.getByLabelText('Target company')).toHaveValue('')
    expect(screen.getByText('164 problems in your line → 6 per day')).toBeInTheDocument()
  })

  it('updates the per-day preview while typing', async () => {
    mockRoutes({ 'GET /settings': { body: saved }, 'GET /stats': { body: stats } })
    renderPage()
    const round = await screen.findByLabelText('Round length (days)')
    await userEvent.clear(round)
    await userEvent.type(round, '60')
    expect(screen.getByText('164 problems in your line → 3 per day')).toBeInTheDocument()
  })

  it('saves the form', async () => {
    const put = vi.fn()
    mockRoutes({
      'GET /settings': { body: saved },
      'GET /stats': { body: stats },
      'PUT /settings': (_url, init) => {
        put(JSON.parse(String(init.body)))
        return { body: JSON.parse(String(init.body)) }
      },
    })
    renderPage()
    const round = await screen.findByLabelText('Round length (days)')
    await userEvent.clear(round)
    await userEvent.type(round, '45')
    await userEvent.selectOptions(screen.getByLabelText('Target company'), 'Google')
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(put).toHaveBeenCalledWith({ round_days: 45, max_daily: 10, new_per_day: 2, target_company: 'Google' })
  })

  it('blocks out-of-range values', async () => {
    const fetchMock = mockRoutes({ 'GET /settings': { body: saved }, 'GET /stats': { body: stats } })
    renderPage()
    const daily = await screen.findByLabelText('Daily limit')
    await userEvent.clear(daily)
    await userEvent.type(daily, '50')

    expect(screen.getByText('Use a whole number from 1 to 30.')).toBeInTheDocument()
    expect(daily).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })

  it('validate() checks every limit', () => {
    const ok = { round_days: '7', max_daily: '30', new_per_day: '0', target_company: '' }
    expect(validate(ok)).toEqual({})
    expect(Object.keys(validate({ ...ok, round_days: '91', new_per_day: '6', max_daily: '' }))).toEqual([
      'round_days',
      'max_daily',
      'new_per_day',
    ])
    expect(validate({ ...ok, round_days: '7.5' }).round_days).toBeDefined()
  })
})
