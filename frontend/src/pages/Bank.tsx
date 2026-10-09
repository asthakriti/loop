import { useEffect, useState } from 'react'
import { listBank, type BankPage, type BankProblem } from '../api/bank'
import { COMPANIES, DIFFICULTIES, PATTERNS } from '../api/constants'
import { addProblem } from '../api/today'
import { Difficulty, Pill } from '../components/bits'
import { FilterBar, SearchInput, SelectFilter, useDebounced } from '../components/Filters'
import { CheckIcon, ExternalIcon } from '../components/icons'
import { ToastList, useToasts } from '../components/Toasts'

const PAGE_SIZE = 25

function BankRow({ problem, busy, onAdd }: { problem: BankProblem; busy: boolean; onAdd: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-4 border-t border-border py-4 first:border-t-0">
      <div className="w-32 shrink-0">
        {problem.solved ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-mint">
            <CheckIcon size={14} /> Solved
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-xs text-accent">
            Priority {problem.priority}/10
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <a href={problem.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-heading font-semibold hover:text-accent">
          {problem.title} <ExternalIcon size={14} className="text-muted" />
        </a>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Pill>{problem.pattern}</Pill>
          <Difficulty value={problem.difficulty} />
          <span className="text-xs text-muted">{problem.companies.slice(0, 3).join(', ')}</span>
        </div>
        {!problem.solved && problem.reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {problem.reasons.map((r) => (
              <Pill key={r} className="border-accent/30 text-accent">
                {r}
              </Pill>
            ))}
          </div>
        )}
      </div>

      {!problem.solved && (
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          aria-label={`Add ${problem.title} to my problems`}
          className="h-11 rounded-btn border border-border-strong px-4 text-sm hover:bg-surface-2 disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add to my problems'}
        </button>
      )}
    </li>
  )
}

export function Bank() {
  const [q, setQ] = useState('')
  const [pattern, setPattern] = useState('')
  const [company, setCompany] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [designOnly, setDesignOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BankPage | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const { toasts, push } = useToasts()
  const search = useDebounced(q)

  // Any filter change starts again from page 1.
  useEffect(() => setPage(1), [search, pattern, company, difficulty, designOnly])

  useEffect(() => {
    let active = true
    listBank({ q: search, pattern, company, difficulty, is_design: designOnly || undefined, page, page_size: PAGE_SIZE })
      .then((d) => {
        if (active) {
          setData(d)
          setError('')
        }
      })
      .catch((e: Error) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [search, pattern, company, difficulty, designOnly, page])

  async function add(problem: BankProblem) {
    setAdding(problem.slug)
    try {
      await addProblem(problem.slug)
      // Mark it solved here, no need to reload the list.
      setData((d) => d && { ...d, items: d.items.map((p) => (p.slug === problem.slug ? { ...p, solved: true } : p)) })
      push(`Added ${problem.title}. It shows in Warm-up tomorrow.`, 'win')
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not add.', 'error')
    } finally {
      setAdding(null)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Problem bank</h1>
        <p className="mt-1 text-muted">
          {data ? `${data.total} problems` : 'Loading…'} · sorted by priority for you. Solved ones go last.
        </p>
      </div>

      <FilterBar>
        <SearchInput label="Search" value={q} onChange={setQ} />
        <SelectFilter label="Pattern" value={pattern} onChange={setPattern} options={PATTERNS} />
        <SelectFilter label="Company" value={company} onChange={setCompany} options={COMPANIES} />
        <SelectFilter label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={designOnly} onChange={(e) => setDesignOnly(e.target.checked)} className="h-4 w-4 accent-accent" />
          Design only
        </label>
      </FilterBar>

      {error && (
        <p role="alert" className="text-coral">
          {error}
        </p>
      )}

      {data && (
        <>
          {data.items.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-6 text-muted">No problems match these filters.</p>
          ) : (
            <ul className="rounded-card border border-border bg-surface px-5">
              {data.items.map((p) => (
                <BankRow key={p.slug} problem={p} busy={adding === p.slug} onAdd={() => add(p)} />
              ))}
            </ul>
          )}

          <nav aria-label="Pages" className="flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-11 rounded-btn border border-border-strong px-4 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-sm text-muted">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="h-11 rounded-btn border border-border-strong px-4 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </>
      )}

      <ToastList toasts={toasts} />
    </div>
  )
}
