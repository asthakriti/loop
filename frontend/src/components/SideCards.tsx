import { Link } from 'react-router-dom'
import type { BadgeStatus } from '../api/badges'
import type { PatternInfo } from '../api/patterns'
import type { Stats } from '../api/stats'
import { TargetIcon, TrophyIcon } from './icons'

const card = 'rounded-card border border-border bg-surface p-5'

export function MilestoneCard({ stats }: { stats: Stats }) {
  const { target, to_go } = stats.milestone
  const percent = Math.round((stats.total_solved / target) * 100)
  return (
    <section aria-labelledby="milestone-heading" className={card}>
      <h2 id="milestone-heading" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
        <TargetIcon size={14} /> Next milestone
      </h2>
      <p className="mt-3 font-heading text-2xl font-semibold">{target} solved</p>
      <p className="text-sm text-muted">{to_go} to go</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 font-mono text-xs text-muted">
        Round {stats.round.number} · {stats.round.revised} / {stats.round.total} revised
      </p>
    </section>
  )
}

export function BadgeGrid({ badges }: { badges: BadgeStatus[] }) {
  return (
    <section aria-labelledby="badges-heading" className={card}>
      <h2 id="badges-heading" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
        <TrophyIcon size={14} /> Badges
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <li
            key={b.code}
            title={b.description}
            className={`rounded-btn border p-3 ${b.unlocked ? 'border-amber/30 bg-surface-2' : 'border-border opacity-45'}`}
          >
            <p className={`text-sm font-medium ${b.unlocked ? 'text-amber' : 'text-text'}`}>{b.name}</p>
            <p className="mt-0.5 text-xs text-muted">{b.unlocked ? 'Unlocked' : b.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PatternGaps({ patterns }: { patterns: PatternInfo[] }) {
  // Patterns with fewer than 3 solved, fewest first.
  const gaps = patterns.filter((p) => p.status !== 'covered').sort((a, b) => a.solved - b.solved).slice(0, 5)
  return (
    <section aria-labelledby="gaps-heading" className={card}>
      <div className="flex items-center justify-between">
        <h2 id="gaps-heading" className="font-mono text-xs uppercase tracking-widest text-muted">
          Pattern gaps
        </h2>
        <Link to="/patterns" className="text-sm text-accent hover:underline">
          See all
        </Link>
      </div>
      {gaps.length === 0 ? (
        <p className="mt-3 text-sm text-mint">All 15 patterns covered. Nice work.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {gaps.map((p) => (
            <li key={p.pattern}>
              <div className="flex justify-between text-sm">
                <span>{p.pattern}</span>
                <span className="font-mono text-muted">{p.solved} / 3</span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1.5 rounded-full ${i < p.solved ? 'bg-mint' : 'bg-surface-2'}`} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
