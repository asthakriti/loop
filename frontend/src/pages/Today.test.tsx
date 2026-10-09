import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../api/client'
import type { Today as TodayData } from '../api/today'
import { AuthProvider } from '../auth/AuthContext'
import { ProgressProvider } from '../state/ProgressContext'
import { calls, mockRoutes } from '../test/helpers'
import { Today } from './Today'

// ---------- fake API data ----------

function todayData(overrides: Partial<TodayData> = {}): TodayData {
  return {
    warmup: [
      { id: 1, title: 'LRU Cache', link: 'https://leetcode.com/problems/lru-cache/', pattern: 'Design', difficulty: 'Medium', notes: null, real_life: 'Browsers keep recent pages.', last_revised_on: null, done_today: false, xp: 10 },
    ],
    loop: [
      { id: 2, title: 'Two Sum', link: 'https://leetcode.com/problems/two-sum/', pattern: 'Hashing', difficulty: 'Easy', notes: 'hash map value -> index', real_life: 'Splitwise finds two payments.', last_revised_on: null, done_today: false, xp: 15 },
      { id: 3, title: 'Add Two Numbers', link: 'https://leetcode.com/problems/add-two-numbers/', pattern: 'Linked List', difficulty: 'Medium', notes: null, real_life: null, last_revised_on: '2026-03-10', done_today: true, xp: 15 },
    ],
    new: [
      { id: null, slug: 'contains-duplicate', title: 'Contains Duplicate', link: 'https://leetcode.com/problems/contains-duplicate/', pattern: 'Hashing', difficulty: 'Easy', real_life: 'Sign-up forms check emails.', score: 10, priority: 7, reasons: ['Fresher topic', 'Amazon', 'Blind 75'], done_today: false, xp: 30 },
    ],
    daily_count: 2,
    warning: null,
    done_count: 1,
    total_count: 4,
    xp_today: 15,
    ...overrides,
  }
}

const progress = {
  total_xp: 15, level: 1, level_name: 'Beginner', level_xp: 0, next_level_xp: 100,
  current_streak: 3, best_streak: 5,
  week: ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15'].map((day, i) => ({ day, done: i === 0 })),
  round: { number: 1, revised: 1, total: 164 },
}
const badges = [
  { code: 'century', name: 'Century', description: 'Solve 100 problems.', unlocked: true, unlocked_on: '2026-03-01' },
  { code: 'builder', name: 'Builder', description: 'Solve your first design problem.', unlocked: false, unlocked_on: null },
]
const patterns = [
  { pattern: 'Heap', solved: 1, total: 7, status: 'in progress', next: null },
  { pattern: 'Arrays', solved: 5, total: 18, status: 'covered', next: null },
]
const stats = { total_solved: 164, solved_per_pattern: [], round: { number: 1, revised: 1, total: 164 }, milestone: { target: 200, to_go: 36 } }
const codeByte = { id: 1, type: 'code', title: 'Count with Counter', content: 'from collections import Counter\nx = 1  # a comment', why_it_matters: 'Counting is O(n).', topic: 'Hashing' }

const doneResult = (xp: number, extra = {}) => ({
  xp_earned: xp, total_xp: 15 + xp, level: 1, level_name: 'Beginner', streak: 3, all_done: false, new_badges: [], ...extra,
})

function baseRoutes(today: () => TodayData = () => todayData()) {
  return {
    'GET /today': () => ({ body: today() }),
    'GET /me/progress': { body: progress },
    'GET /badges': { body: badges },
    'GET /patterns': { body: patterns },
    'GET /stats': { body: stats },
    'GET /byte/today': (url: URL) =>
      url.searchParams.get('offset') === '1'
        ? { body: { ...codeByte, id: 2, title: 'Group anagrams' } }
        : url.searchParams.get('type') === 'fact'
          ? { body: { ...codeByte, id: 3, type: 'fact', title: 'Python sorts with Timsort', content: 'Tim Peters, 2002.' } }
          : { body: codeByte },
  }
}

function renderToday() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ProgressProvider>
          <Today />
        </ProgressProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => setToken('test-token'))
afterEach(() => vi.unstubAllGlobals())

// ---------- tests ----------

describe('Today page', () => {
  it('shows the hero, sections and side cards', async () => {
    mockRoutes(baseRoutes())
    renderToday()

    expect(await screen.findByRole('heading', { name: 'Keep the loop going.' })).toBeInTheDocument()
    expect(screen.getByText(/quests cleared today/)).toHaveTextContent('1 of 4 quests cleared today.')
    expect(screen.getByText('85 XP to Level 2')).toBeInTheDocument()
    expect(screen.getByText('3-day streak')).toBeInTheDocument()
    expect(screen.getByText('Best ever: 5')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Warm-up' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Loop' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New quests' })).toBeInTheDocument()
    expect(screen.getByText('15 / 70 XP today')).toBeInTheDocument()

    // A row: note, real-life box and an accessible LeetCode link.
    const twoSum = screen.getByRole('article', { name: 'Two Sum' })
    expect(within(twoSum).getByText('↳ hash map value -> index')).toBeInTheDocument()
    expect(within(twoSum).getByText('Splitwise finds two payments.')).toBeInTheDocument()
    expect(within(twoSum).getByRole('link', { name: 'Open Two Sum on LeetCode' })).toHaveAttribute('href', 'https://leetcode.com/problems/two-sum/')

    // A row done today shows the XP instead of the button.
    const done = screen.getByRole('article', { name: 'Add Two Numbers' })
    expect(within(done).getByText('+15 XP')).toBeInTheDocument()
    expect(within(done).queryByRole('button', { name: 'Clear it' })).not.toBeInTheDocument()

    // New quest card.
    const quest = screen.getByRole('article', { name: 'Contains Duplicate' })
    expect(within(quest).getByText('Priority 7/10')).toBeInTheDocument()
    expect(within(quest).getByText('Asked by Amazon, in Blind 75.')).toBeInTheDocument()

    // Side column and Daily Byte.
    expect(screen.getByText('200 solved')).toBeInTheDocument()
    expect(screen.getByText('36 to go')).toBeInTheDocument()
    expect(screen.getByText('Heap')).toBeInTheDocument()
    expect(screen.queryByText('Arrays')).not.toBeInTheDocument() // covered patterns are not gaps
    expect(await screen.findByText('Count with Counter')).toBeInTheDocument()
  })

  it('"Clear it" marks the problem done, shows a toast and refreshes', async () => {
    let cleared = false
    const fetchMock = mockRoutes({
      ...baseRoutes(() => {
        const data = todayData()
        if (cleared) data.loop[0] = { ...data.loop[0], done_today: true }
        return data
      }),
      'POST /my/problems/2/done': () => {
        cleared = true
        return { body: doneResult(15) }
      },
    })
    renderToday()

    const twoSum = await screen.findByRole('article', { name: 'Two Sum' })
    await userEvent.click(within(twoSum).getByRole('button', { name: 'Clear it' }))

    expect(await screen.findByRole('status')).toHaveTextContent('+15 XP')
    expect(await within(twoSum).findByText('+15 XP')).toBeInTheDocument()
    const doneCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/my/problems/2/done'))
    expect(JSON.parse(String(doneCall?.[1]?.body))).toEqual({ section: 'loop' })
  })

  it('"Solved it" adds the problem, marks it done as new, and shows new badges', async () => {
    const fetchMock = mockRoutes({
      ...baseRoutes(),
      'POST /my/problems': { status: 201, body: { id: 99 } },
      'POST /my/problems/99/done': {
        body: doneResult(30, { new_badges: [{ code: 'builder', name: 'Builder', description: '' }] }),
      },
    })
    renderToday()

    const quest = await screen.findByRole('article', { name: 'Contains Duplicate' })
    await userEvent.click(within(quest).getByRole('button', { name: 'Solved it' }))

    const toasts = await screen.findByRole('status')
    expect(await within(toasts).findByText('+30 XP')).toBeInTheDocument()
    expect(within(toasts).getByText('Badge unlocked: Builder')).toBeInTheDocument()

    const list = calls(fetchMock)
    const addIndex = list.indexOf('POST /my/problems')
    expect(addIndex).toBeGreaterThan(-1)
    expect(list.indexOf('POST /my/problems/99/done')).toBeGreaterThan(addIndex)
  })

  it('shows the "All quests cleared" banner when everything is done', async () => {
    mockRoutes(baseRoutes(() => todayData({ done_count: 4, total_count: 4, xp_today: 70 })))
    renderToday()
    expect(await screen.findByText('+70 XP · All quests cleared')).toBeInTheDocument()
  })

  it('shows the warning when there are too many problems', async () => {
    mockRoutes(baseRoutes(() => todayData({ warning: 'Too many problems today.' })))
    renderToday()
    expect(await screen.findByText('Too many problems today.')).toBeInTheDocument()
  })

  it('Daily Byte: Next loads the next byte, Fact tab loads a fact', async () => {
    const fetchMock = mockRoutes(baseRoutes())
    renderToday()

    await screen.findByText('Count with Counter')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Group anagrams')).toBeInTheDocument()
    expect(calls(fetchMock)).toContain('GET /byte/today?type=code&offset=1')

    await userEvent.click(screen.getByRole('tab', { name: 'Fact' }))
    expect(await screen.findByText('Python sorts with Timsort')).toBeInTheDocument()
    expect(calls(fetchMock)).toContain('GET /byte/today?type=fact&offset=0')
  })
})
