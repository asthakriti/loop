import type { Progress } from '../api/progress'

/** Progress inside the current level, from 0 to 100. */
export function levelPercent(p: Pick<Progress, 'total_xp' | 'level_xp' | 'next_level_xp'>): number {
  if (p.next_level_xp === null) return 100
  const span = p.next_level_xp - p.level_xp
  return Math.min(100, Math.max(0, Math.round(((p.total_xp - p.level_xp) / span) * 100)))
}

export function LevelCard({ progress }: { progress: Progress }) {
  const percent = levelPercent(progress)
  const toNext = progress.next_level_xp === null ? null : progress.next_level_xp - progress.total_xp

  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-btn bg-lavender/15 text-center font-heading leading-none text-lavender">
        <span>
          <span className="block text-[10px] tracking-widest">LVL</span>
          <span className="text-2xl font-bold">{progress.level}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold">{progress.level_name}</p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="XP in this level"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-lavender transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 font-mono text-xs text-muted">
          {toNext === null ? 'Max level reached' : `${toNext} XP to Level ${progress.level + 1}`}
        </p>
      </div>
    </div>
  )
}
