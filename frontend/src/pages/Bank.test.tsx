import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BankProblem } from '../api/bank'
import { setToken } from '../api/client'
import { calls, mockRoutes } from '../test/helpers'
import { Bank } from './Bank'

function bankProblem(id: number, title: string, extra: Partial<BankProblem> = {}): BankProblem {
  return {
    id, title, slug: title.toLowerCase().replace(/ /g, '-'), link: `https://leetcode.com/problems/${id}/`,
    topic: 'Arrays', pattern: 'Hashing', difficulty: 'Easy', companies: ['Amazon', 'Google'], sources: ['Blind 75'],
    is_design: false, is_custom: false, real_life: null, solved: false, priority: 7, reasons: ['Fresher topic'], ...extra,
  }
}

const page = (items: BankProblem[], total = items.length) => ({ items, total, page: 1, page_size: 25 })

function renderPage() {
  render(
    <MemoryRouter>
      <Bank />
    </MemoryRouter>,
  )
}

beforeEach(() => setToken('test-token'))
afterEach(() => vi.unstubAllGlobals())

describe('Problem bank page', () => {
  it('asks for priority order and shows priority or solved', async () => {
    const fetchMock = mockRoutes({
      'GET /bank': { body: page([bankProblem(1, 'Contains Duplicate'), bankProblem(2, 'Two Sum', { solved: true, priority: null })]) },
    })
    renderPage()
    expect(await screen.findByText('Priority 7/10')).toBeInTheDocument()
    expect(screen.getByText('Solved')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Two Sum to my problems' })).not.toBeInTheDocument()
    expect(calls(fetchMock)[0]).toBe('GET /bank?sort=priority&page=1&page_size=25')
  })

  it('sends the filters', async () => {
    const fetchMock = mockRoutes({ 'GET /bank': { body: page([bankProblem(1, 'LRU Cache')]) } })
    renderPage()
    await screen.findByText('LRU Cache')

    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'Design')
    await userEvent.selectOptions(screen.getByLabelText('Company'), 'Amazon')
    await userEvent.selectOptions(screen.getByLabelText('Difficulty'), 'Medium')
    await userEvent.click(screen.getByLabelText('Design only'))

    await waitFor(() =>
      expect(calls(fetchMock)).toContain(
        'GET /bank?sort=priority&pattern=Design&company=Amazon&difficulty=Medium&is_design=true&page=1&page_size=25',
      ),
    )
  })

  it('"Add to my problems" adds it and marks it solved', async () => {
    const fetchMock = mockRoutes({
      'GET /bank': { body: page([bankProblem(1, 'Contains Duplicate')]) },
      'POST /my/problems': { status: 201, body: { id: 50 } },
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Add Contains Duplicate to my problems' }))

    expect(await screen.findByText('Solved')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Added Contains Duplicate. It shows in Warm-up tomorrow.')
    const add = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(add?.[1]?.body))).toEqual({ slug: 'contains-duplicate' })
  })

  it('pages through results', async () => {
    const fetchMock = mockRoutes({
      'GET /bank': (url) => ({ body: { ...page([bankProblem(1, `Problem on page ${url.searchParams.get('page')}`)], 60) } }),
    })
    renderPage()
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Problem on page 2')).toBeInTheDocument()
    expect(calls(fetchMock)).toContain('GET /bank?sort=priority&page=2&page_size=25')
  })
})
