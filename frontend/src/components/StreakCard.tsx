import type { Progress } from '../api/progress'
import { FlameIcon } from './icons'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function isoToday(now: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function StreakCard({ progress, now = new Date() }: { progress: Progress; now?: Date }) {
  const today = isoToday(now)
  const streak = progress.current_streak

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-btn bg-amber/15 text-amber">
          <FlameIcon size={20} />
        </span>
        <div>
          <p className="font-heading font-semibold">{streak}-day streak</p>
          <p className="text-xs text-muted">Best ever: {progress.best_streak}</p>
        </div>
      </div>

      {/* Monday to Sunday. Filled = every quest cleared that day. Today has an outline. */}
      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="This week">
        {progress.week.map((d, i) => {
          const isToday = d.day === today
          return (
            <li
              key={d.day}
              aria-label={`${d.day}${d.done ? ', cleared' : ''}${isToday ? ', today' : ''}`}
              className={`grid h-9 place-items-center rounded-lg font-mono text-xs ${
                d.done ? 'bg-amber text-bg' : 'bg-surface-2 text-muted'
              } ${isToday ? 'ring-2 ring-amber ring-offset-2 ring-offset-surface' : ''}`}
            >
              {DAY_LETTERS[i]}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
