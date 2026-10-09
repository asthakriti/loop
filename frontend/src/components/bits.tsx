import { GlobeIcon } from './icons'

// Small building blocks used by many rows and cards.

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-mint',
  Medium: 'text-amber',
  Hard: 'text-coral',
}

export function Difficulty({ value }: { value: string }) {
  return <span className={`text-sm font-medium ${DIFFICULTY_COLOR[value] ?? 'text-muted'}`}>{value}</span>
}

export function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-border-strong px-2.5 py-0.5 text-xs text-muted ${className}`}>
      {children}
    </span>
  )
}

// The sky-blue "In real life" box: where this problem shows up in real apps.
export function RealLifeBox({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div className="flex gap-2 rounded-btn border border-sky-border bg-sky-bg px-3 py-2 text-sm">
      <GlobeIcon size={16} className="mt-0.5 shrink-0 text-sky" />
      <p>
        <span className="font-medium text-sky">In real life · </span>
        <span className="text-text/90">{text}</span>
      </p>
    </div>
  )
}

/** Whole days between an ISO date ("2026-03-01") and today, in local time. */
export function daysAgo(isoDate: string, now: Date = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const then = Date.UTC(y, m - 1, d)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today - then) / 86_400_000)
}

export function lastSeenText(isoDate: string | null, now?: Date): string {
  if (!isoDate) return 'Never revised'
  const days = daysAgo(isoDate, now)
  if (days <= 0) return 'Seen today'
  if (days === 1) return 'Last seen yesterday'
  return `Last seen ${days} days ago`
}
