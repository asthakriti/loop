import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DIFFICULTIES, PATTERNS } from '../api/constants'
import {
  deleteProblem,
  importSolvedCsv,
  listMyProblems,
  retireProblem,
  updateNotes,
  type MyProblem,
  type Status,
} from '../api/myProblems'
import { Difficulty, lastSeenText, Pill } from '../components/bits'
import { FilterBar, SearchInput, SelectFilter, useDebounced } from '../components/Filters'
import { ExternalIcon } from '../components/icons'
import { ToastList, useToasts } from '../components/Toasts'

const STATUS_LABEL: Record<Status, string> = { new: 'Warm-up next', in_queue: 'In the line', retired: 'Retired' }
const STATUS_STYLE: Record<Status, string> = {
  new: 'border-amber/40 text-amber',
  in_queue: 'border-lavender/40 text-lavender',
  retired: 'border-border-strong text-muted',
}
const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))

const smallButton = 'h-9 rounded-lg border border-border-strong px-3 text-xs hover:bg-surface-2 disabled:opacity-50'

// ---------- one table row ----------

type RowProps = {
  problem: MyProblem
  onChanged: (p: MyProblem) => void
  onDeleted: (id: number) => void
  onError: (message: string) => void
}

function ProblemRow({ problem, onChanged, onDeleted, onError }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(problem.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  const saveNotes = () =>
    run(async () => {
      onChanged(await updateNotes(problem.id, draft.trim() || null))
      setEditing(false)
    })

  function onNotesKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') saveNotes()
    if (e.key === 'Escape') {
      setDraft(problem.notes ?? '')
      setEditing(false)
    }
  }

  return (
    <tr className="border-t border-border align-top">
      <td className="py-3 pr-3">
        <a href={problem.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-accent">
          {problem.title} <ExternalIcon size={14} className="text-muted" />
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Pill>{problem.pattern}</Pill>
          <Difficulty value={problem.difficulty} />
        </div>
      </td>
      <td className="py-3 pr-3">
        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[problem.status]}`}>
          {STATUS_LABEL[problem.status]}
        </span>
      </td>
      <td className="py-3 pr-3 text-sm text-muted">
        {lastSeenText(problem.last_revised_on)}
        <div className="font-mono text-xs">{problem.times_revised}× revised</div>
      </td>
      <td className="min-w-56 py-3 pr-3">
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={draft}
              maxLength={500}
              aria-label={`Note for ${problem.title}`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onNotesKey}
              className="h-9 min-w-0 flex-1 rounded-lg border border-accent bg-bg px-2 font-mono text-xs outline-none"
            />
            <button type="button" className={smallButton} disabled={busy} onClick={saveNotes}>
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit note for ${problem.title}`}
            className="w-full rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted hover:bg-surface-2"
          >
            {problem.notes ? `↳ ${problem.notes}` : '+ Add a 1-line trick'}
          </button>
        )}
      </td>
      <td className="py-3 text-right">
        {confirmDelete ? (
          <div className="flex justify-end gap-2">
            <span className="self-center text-xs text-coral">Delete?</span>
            <button
              type="button"
              className={`${smallButton} border-coral/50 text-coral`}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await deleteProblem(problem.id)
                  onDeleted(problem.id)
                })
              }
            >
              Yes, delete
            </button>
            <button type="button" className={smallButton} onClick={() => setConfirmDelete(false)}>
              No
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            {problem.status !== 'retired' && (
              <button
                type="button"
                className={smallButton}
                disabled={busy}
                aria-label={`Retire ${problem.title}`}
                onClick={() => run(async () => onChanged(await retireProblem(problem.id)))}
              >
                Retire
              </button>
            )}
            <button type="button" className={smallButton} aria-label={`Delete ${problem.title}`} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ---------- the page ----------

export function MyProblems() {
  const [q, setQ] = useState('')
  const [pattern, setPattern] = useState('')
  const [status, setStatus] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [problems, setProblems] = useState<MyProblem[] | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const { toasts, push } = useToasts()
  const search = useDebounced(q)

  const load = useCallback(async () => {
    try {
      setProblems(await listMyProblems({ q: search, pattern, status, difficulty }))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your problems.')
    }
  }, [search, pattern, status, difficulty])

  useEffect(() => {
    load()
  }, [load])

  async function onFile(file: File | undefined) {
    if (!file) return
    setImporting(true)
    try {
      const r = await importSolvedCsv(file)
      const parts = [`Added ${r.created}`, `skipped ${r.skipped}`]
      if (r.custom_created) parts.push(`${r.custom_created} contest problems`)
      push(parts.join(', '), 'win')
      if (r.missing.length) push(`${r.missing.length} not found in the bank`, 'error')
      await load()
    } catch (e) {
      push(e instanceof Error ? e.message : 'Import failed.', 'error')
    } finally {
      setImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const replace = (updated: MyProblem) => setProblems((list) => list?.map((p) => (p.id === updated.id ? updated : p)) ?? null)
  const remove = (id: number) => setProblems((list) => list?.filter((p) => p.id !== id) ?? null)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My problems</h1>
          <p className="mt-1 text-muted">
            {problems ? `${problems.length} problems` : 'Loading…'} · edit your 1-line trick, retire easy ones.
          </p>
        </div>
        <div>
          <input
            ref={fileInput}
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <label
            htmlFor="csv-file"
            className={`inline-flex h-11 cursor-pointer items-center rounded-btn bg-accent px-4 font-heading text-sm font-semibold text-bg hover:opacity-90 ${importing ? 'pointer-events-none opacity-60' : ''}`}
          >
            {importing ? 'Importing…' : 'Import CSV'}
          </label>
        </div>
      </div>

      <FilterBar>
        <SearchInput label="Search" value={q} onChange={setQ} />
        <SelectFilter label="Pattern" value={pattern} onChange={setPattern} options={[...PATTERNS, 'Contest / other']} />
        <SelectFilter label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <SelectFilter label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
      </FilterBar>

      {error && (
        <p role="alert" className="text-coral">
          {error}
        </p>
      )}

      {problems && problems.length === 0 && !error && (
        <p className="rounded-card border border-border bg-surface p-6 text-muted">
          No problems here. Import your solved list with the <strong className="text-text">Import CSV</strong> button
          (same columns as <span className="font-mono">my_solved.csv</span>).
        </p>
      )}

      {problems && problems.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border bg-surface px-4">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="font-mono text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="py-3 font-normal">Problem</th>
                <th scope="col" className="py-3 font-normal">Status</th>
                <th scope="col" className="py-3 font-normal">Last revised</th>
                <th scope="col" className="py-3 font-normal">Note</th>
                <th scope="col" className="py-3 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <ProblemRow key={p.id} problem={p} onChanged={replace} onDeleted={remove} onError={(m) => push(m, 'error')} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastList toasts={toasts} />
    </div>
  )
}
