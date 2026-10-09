import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../api/client'
import type { PatternInfo, Suggestion } from '../api/patterns'
import { mockRoutes } from '../test/helpers'
import { Patterns } from './Patterns'

const next: Suggestion = {
  slug: 'kth-largest-element-in-an-array', title: 'Kth Largest Element in an Array', link: 'https://leetcode.com/problems/kth-largest-element-in-an-array/',
  pattern: 'Heap', difficulty: 'Medium', real_life: 'Leaderboards pick the top k scores.', score: 9, priority: 6, reasons: ['Amazon', 'New pattern'],
}

const NAMES = ['Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Sorting', 'Linked List',
  'Stack / Queue', 'Recursion', 'Trees', 'Graphs', 'Heap', 'Basic DP', 'Design']

const patterns: PatternInfo[] = NAMES.map((name) => ({
  pattern: name,
  solved: name === 'Arrays' ? 5 : name === 'Heap' ? 1 : 0,
  total: 10,
  status: name === 'Arrays' ? 'covered' : name === 'Heap' ? 'in progress' : 'not started',
  next: name === 'Heap' ? next : null,
}))

function routes(target: string | null) {
  return mockRoutes({
    'GET /patterns': { body: patterns },
    'GET /stats': {
      body: {
        total_solved: 6, solved_per_pattern: [{ pattern: 'Arrays', solved: 5 }, { pattern: 'Heap', solved: 1 }],
        round: { number: 1, revised: 0, total: 6 }, milestone: { target: 100, to_go: 94 },
      },
    },
    'GET /suggest': { body: [next] },
    'GET /settings': { body: { round_days: 30, max_daily: 10, new_per_day: 2, target_company: target } },
    'GET /bank': (url) => ({ body: { items: [], total: url.searchParams.get('solved') ? 120 : 263, page: 1, page_size: 1 } }),
  })
}

function renderPage() {
  render(
    <MemoryRouter>
      <Patterns />
    </MemoryRouter>,
  )
}

beforeEach(() => setToken('test-token'))
afterEach(() => vi.unstubAllGlobals())

describe('Patterns page', () => {
  it('shows all 15 pattern cards with status and dots', async () => {
    routes(null)
    renderPage()
    expect(await screen.findByText(/1 of 15/)).toBeInTheDocument()
    for (const name of NAMES) expect(screen.getByRole('article', { name })).toBeInTheDocument()

    const arrays = screen.getByRole('article', { name: 'Arrays' })
    expect(within(arrays).getByText('Covered')).toBeInTheDocument()
    expect(within(arrays).getByLabelText('3 of 3')).toBeInTheDocument() // dots stop at 3

    const heap = screen.getByRole('article', { name: 'Heap' })
    expect(within(heap).getByText('In progress')).toBeInTheDocument()
    expect(within(heap).getByLabelText('1 of 3')).toBeInTheDocument()
    expect(within(heap).getByRole('link', { name: /Kth Largest Element/ })).toHaveAttribute('href', next.link)
  })

  it('shows the suggested next problem and solved-by-topic bars', async () => {
    routes(null)
    renderPage()
    const suggested = await screen.findByRole('region', { name: 'Suggested next' })
    expect(within(suggested).getByText('Kth Largest Element in an Array')).toBeInTheDocument()
    expect(within(suggested).getByText('Priority 6/10')).toBeInTheDocument()

    const topics = screen.getByRole('region', { name: 'Solved by topic' })
    expect(within(topics).getByText('Arrays')).toBeInTheDocument()
    expect(within(topics).getByText('5')).toBeInTheDocument()
  })

  it('shows progress for the target company', async () => {
    routes('Amazon')
    renderPage()
    const card = await screen.findByRole('region', { name: 'Target company' })
    expect(within(card).getByText('Amazon')).toBeInTheDocument()
    expect(await within(card).findByText('120 / 263 of its problems solved')).toBeInTheDocument()
  })

  it('asks to pick a company when none is set', async () => {
    routes(null)
    renderPage()
    const card = await screen.findByRole('region', { name: 'Target company' })
    expect(within(card).getByRole('link', { name: 'Choose a company' })).toHaveAttribute('href', '/settings')
  })
})
