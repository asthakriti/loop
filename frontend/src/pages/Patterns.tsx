import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBank } from '../api/bank'
import { getPatterns, getSuggestions, type PatternInfo, type Suggestion } from '../api/patterns'
import { getSettings } from '../api/settings'
import { getStats, type Stats } from '../api/stats'
import { Difficulty, Pill, RealLifeBox } from '../components/bits'
import { ExternalIcon, TargetIcon } from '../components/icons'

const STATUS_STYLE: Record<PatternInfo['status'], string> = {
  covered: 'text-mint',
  'in progress': 'text-amber',
  'not started': 'text-muted',
}

// Three dots: one per solved problem, up to the 3 needed to cover a pattern.
function Dots({ solved }: { solved: number }) {
  return (
    <span className="flex gap-1" aria-label={`${Math.min(solved, 3)} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < solved ? 'bg-mint' : 'bg-surface-2 ring-1 ring-border-strong'}`} />
      ))}
    </span>
  )
}

function PatternCard({ info }: { info: PatternInfo }) {
  return (
    <article aria-label={info.pattern} className="flex flex-col rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading font-semibold">{info.pattern}</h3>
        <Dots solved={info.solved} />
      </div>
      <p className="mt-1 text-sm">
        <span className={STATUS_STYLE[info.status]}>{info.status === 'covered' ? 'Covered' : info.status === 'in progress' ? 'In progress' : 'Not started'}</span>
        <span className="text-muted"> · {info.solved} / {info.total} in bank</span>
      </p>
      <div className="mt-auto pt-3">
        {info.next ? (
          <a href={info.next.link} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-2 rounded-btn border border-border px-3 py-2 text-sm hover:border-border-strong">
            <span className="min-w-0">
              <span className="block font-mono text-[11px] uppercase tracking-wider text-muted">Next</span>
              <span className="block truncate group-hover:text-accent" title={info.next.title}>
                {info.next.title}
              </span>
            </span>
            <Difficulty value={info.next.difficulty} />
          </a>
        ) : (
          <p className="text-sm text-mint">Every problem done.</p>
        )}
      </div>
    </article>
  )
}

function TopicBars({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.solved_per_pattern.map((p) => p.solved))
  return (
    <section aria-labelledby="topics-heading" className="rounded-card border border-border bg-surface p-5">
      <h2 id="topics-heading" className="font-mono text-xs uppercase tracking-widest text-muted">
        Solved by topic
      </h2>
      {stats.solved_per_pattern.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing solved yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {stats.solved_per_pattern.map((p) => (
            <li key={p.pattern} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="truncate">{p.pattern}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-lavender" style={{ width: `${(p.solved / max) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-muted">{p.solved}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CompanyCard({ company, solved, total }: { company: string | null; solved: number; total: number }) {
  return (
    <section aria-labelledby="company-heading" className="rounded-card border border-border bg-surface p-5">
      <h2 id="company-heading" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
        <TargetIcon size={14} /> Target company
      </h2>
      {company ? (
        <>
          <p className="mt-3 font-heading text-2xl font-semibold">{company}</p>
          <p className="text-sm text-muted">
            {solved} / {total} of its problems solved
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (solved / total) * 100 : 0}%` }} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">No target company yet. Pick one to get +3 priority on its problems.</p>
      )}
      <Link to="/settings" className="mt-3 inline-block text-sm text-accent hover:underline">
        {company ? 'Change' : 'Choose a company'}
      </Link>
    </section>
  )
}

function SuggestedCard({ next }: { next: Suggestion | null }) {
  return (
    <section aria-labelledby="suggested-heading" className="rounded-card border border-accent/30 bg-surface p-5">
      <h2 id="suggested-heading" className="font-mono text-xs uppercase tracking-widest text-accent">
        Suggested next
      </h2>
      {next ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-xs text-accent">Priority {next.priority}/10</span>
            <Difficulty value={next.difficulty} />
          </div>
          <p className="mt-2 font-heading text-lg font-semibold">{next.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill>{next.pattern}</Pill>
            {next.reasons.map((r) => (
              <Pill key={r} className="border-accent/30 text-accent">
                {r}
              </Pill>
            ))}
          </div>
          <div className="mt-3">
            <RealLifeBox text={next.real_life} />
          </div>
          <a
            href={next.link}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-accent font-heading text-sm font-semibold text-bg hover:opacity-90"
          >
            Open on LeetCode <ExternalIcon size={16} />
          </a>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">You have solved the whole bank.</p>
      )}
    </section>
  )
}

export function Patterns() {
  const [patterns, setPatterns] = useState<PatternInfo[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [next, setNext] = useState<Suggestion | null>(null)
  const [company, setCompany] = useState<{ name: string | null; solved: number; total: number }>({ name: null, solved: 0, total: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [p, s, suggestions, settings] = await Promise.all([getPatterns(), getStats(), getSuggestions(1), getSettings()])
        setPatterns(p)
        setStats(s)
        setNext(suggestions[0] ?? null)
        if (settings.target_company) {
          const name = settings.target_company
          const [all, solved] = await Promise.all([
            listBank({ company: name, page_size: 1 }),
            listBank({ company: name, solved: true, page_size: 1 }),
          ])
          setCompany({ name, solved: solved.total, total: all.total })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load patterns.')
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <p role="alert" className="text-coral">
        {error}
      </p>
    )
  }
  if (!patterns || !stats) return <p className="text-muted">Loading patterns…</p>

  const covered = patterns.filter((p) => p.status === 'covered').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Patterns</h1>
        <p className="mt-1 text-muted">
          <span className="text-text">{covered} of 15</span> patterns covered. A pattern is covered after 3 solved problems.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {patterns.map((p) => (
            <PatternCard key={p.pattern} info={p} />
          ))}
        </div>
        <aside className="flex flex-col gap-6">
          <SuggestedCard next={next} />
          <CompanyCard company={company.name} solved={company.solved} total={company.total} />
          <TopicBars stats={stats} />
        </aside>
      </div>
    </div>
  )
}
