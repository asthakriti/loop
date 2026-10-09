import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../api/client'
import type { MyProblem } from '../api/myProblems'
import { calls, mockRoutes } from '../test/helpers'
import { MyProblems } from './MyProblems'

function problem(id: number, title: string, extra: Partial<MyProblem> = {}): MyProblem {
  return {
    id, problem_id: id, slug: title.toLowerCase().replace(/ /g, '-'), title, link: `https://leetcode.com/problems/${id}/`,
    pattern: 'Hashing', difficulty: 'Easy', is_custom: false, real_life: null, status: 'in_queue',
    solved_on: '2026-03-01', last_revised_on: null, times_revised: 0, notes: null, ...extra,
  }
}

const list = [problem(1, 'Two Sum', { notes: 'hash map' }), problem(2, 'Valid Anagram')]

function renderPage() {
  render(
    <MemoryRouter>
      <MyProblems />
    </MemoryRouter>,
  )
}

beforeEach(() => setToken('test-token'))
afterEach(() => vi.unstubAllGlobals())

describe('My problems page', () => {
  it('lists problems with notes and status', async () => {
    mockRoutes({ 'GET /my/problems': { body: list } })
    renderPage()
    const row = (await screen.findByText('Two Sum')).closest('tr')!
    expect(within(row).getByText('↳ hash map')).toBeInTheDocument()
    expect(within(row).getByText('In the line')).toBeInTheDocument()
    expect(screen.getByText(/2 problems/)).toBeInTheDocument()
  })

  it('sends the filters to the API', async () => {
    const fetchMock = mockRoutes({ 'GET /my/problems': { body: list } })
    renderPage()
    await screen.findByText('Two Sum')

    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'Graphs')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'retired')
    await userEvent.type(screen.getByLabelText('Search'), 'sum')

    await waitFor(() =>
      expect(calls(fetchMock)).toContain('GET /my/problems?q=sum&pattern=Graphs&status=retired'),
    )
  })

  it('edits a note inline and saves on Enter', async () => {
    const fetchMock = mockRoutes({
      'GET /my/problems': { body: list },
      'PUT /my/problems/2': (_url, init) => ({ body: { ...list[1], notes: JSON.parse(String(init.body)).notes } }),
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Edit note for Valid Anagram' }))
    await userEvent.type(screen.getByLabelText('Note for Valid Anagram'), 'count letters{Enter}')

    expect(await screen.findByText('↳ count letters')).toBeInTheDocument()
    expect(calls(fetchMock)).toContain('PUT /my/problems/2')
  })

  it('Escape cancels the note edit', async () => {
    mockRoutes({ 'GET /my/problems': { body: list } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Edit note for Two Sum' }))
    await userEvent.type(screen.getByLabelText('Note for Two Sum'), ' changed{Escape}')
    expect(screen.getByText('↳ hash map')).toBeInTheDocument()
  })

  it('retires a problem', async () => {
    mockRoutes({
      'GET /my/problems': { body: list },
      'POST /my/problems/1/retire': { body: { ...list[0], status: 'retired' } },
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Retire Two Sum' }))
    const row = screen.getByText('Two Sum').closest('tr')!
    expect(await within(row).findByText('Retired')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Retire Two Sum' })).not.toBeInTheDocument()
  })

  it('asks before deleting, then removes the row', async () => {
    const fetchMock = mockRoutes({
      'GET /my/problems': { body: list },
      'DELETE /my/problems/2': { status: 204 },
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Valid Anagram' }))
    expect(calls(fetchMock)).not.toContain('DELETE /my/problems/2') // not yet, it asks first

    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(screen.queryByText('Valid Anagram')).not.toBeInTheDocument())
    expect(calls(fetchMock)).toContain('DELETE /my/problems/2')
  })

  it('imports a CSV and shows the result', async () => {
    let imported = false
    const fetchMock = mockRoutes({
      'GET /my/problems': () => ({ body: imported ? list : [] }),
      'POST /my/problems/import': () => {
        imported = true
        return { body: { created: 2, skipped: 0, custom_created: 1, missing: [] } }
      },
    })
    renderPage()
    expect(await screen.findByText(/No problems here/)).toBeInTheDocument()

    const file = new File(['slug,title\n'], 'my_solved.csv', { type: 'text/csv' })
    await userEvent.upload(screen.getByLabelText('Import CSV'), file)

    expect(await screen.findByText('Added 2, skipped 0, 1 contest problems')).toBeInTheDocument()
    expect(await screen.findByText('Two Sum')).toBeInTheDocument()
    const upload = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/my/problems/import'))
    expect(upload?.[1]?.body).toBeInstanceOf(FormData)
  })
})
