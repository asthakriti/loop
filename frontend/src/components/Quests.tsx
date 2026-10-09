import type { NewQuestItem, TodayItem } from '../api/today'
import { Difficulty, lastSeenText, Pill, RealLifeBox } from './bits'
import { CheckIcon, ExternalIcon } from './icons'

// ---------- section header + wrapper ----------

type SectionProps = {
  id: string
  title: string
  subtitle: string
  xpEach: number
  icon: React.ReactNode
  tone: string // tailwind classes for the icon tile
  children: React.ReactNode
}

export function QuestSection({ id, title, subtitle, xpEach, icon, tone, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="rounded-card border border-border bg-surface p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-btn ${tone}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <span className="font-mono text-sm text-muted">+{xpEach} XP each</span>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function LinkButton({ href, title }: { href: string; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${title} on LeetCode`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-btn border border-border-strong text-muted hover:text-text"
    >
      <ExternalIcon />
    </a>
  )
}

function DoneMark({ xp }: { xp: number }) {
  return (
    <span className="inline-flex h-11 items-center gap-1.5 px-2 font-mono text-sm text-mint">
      <CheckIcon size={16} /> +{xp} XP
    </span>
  )
}

// ---------- Warm-up and Loop rows ----------

type RowProps = { item: TodayItem; busy: boolean; onClear: () => void }

export function QuestRow({ item, busy, onClear }: RowProps) {
  return (
    <article
      className={`rounded-btn border border-border bg-bg/40 p-4 transition-opacity ${item.done_today ? 'opacity-50' : ''}`}
      aria-label={item.title}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold">{item.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Pill>{item.pattern}</Pill>
            <Difficulty value={item.difficulty} />
            <span className="text-xs text-muted">{lastSeenText(item.last_revised_on)}</span>
          </div>
          {item.notes && <p className="mt-2 font-mono text-xs text-muted">↳ {item.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href={item.link} title={item.title} />
          {item.done_today ? (
            <DoneMark xp={item.xp} />
          ) : (
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              className="h-11 rounded-btn bg-accent px-4 font-heading text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Clear it'}
            </button>
          )}
        </div>
      </div>
      {!item.done_today && item.real_life && (
        <div className="mt-3">
          <RealLifeBox text={item.real_life} />
        </div>
      )}
    </article>
  )
}

// ---------- New quest cards ----------

/** "Asked by Amazon · in Blind 75" style line built from the reason tags. */
export function whyLine(reasons: string[]): string {
  const known = new Set(['Fresher topic', 'Design', 'New pattern'])
  const lists = new Set(['Blind 75', 'NeetCode 150', 'Striver SDE', 'Fresher classic'])
  const parts: string[] = []
  const company = reasons.find((r) => !known.has(r) && !lists.has(r))
  const list = reasons.find((r) => lists.has(r))
  if (company) parts.push(`Asked by ${company}`)
  if (list) parts.push(`in ${list}`)
  if (reasons.includes('New pattern')) parts.push('fills a pattern gap')
  if (reasons.includes('Design')) parts.push('build it from scratch')
  if (parts.length === 0) return 'A good next step for you.'
  const text = parts.join(', ')
  return text[0].toUpperCase() + text.slice(1) + '.'
}

type CardProps = { quest: NewQuestItem; busy: boolean; onSolved: () => void }

export function NewQuestCard({ quest, busy, onSolved }: CardProps) {
  return (
    <article
      aria-label={quest.title}
      className={`flex flex-col rounded-btn border border-border bg-bg/40 p-4 transition-opacity ${quest.done_today ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-xs text-accent">
          Priority {quest.priority}/10
        </span>
        <Difficulty value={quest.difficulty} />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{quest.title}</h3>
      <p className="mt-1 text-sm text-muted">{whyLine(quest.reasons)}</p>
      {!quest.done_today && quest.real_life && (
        <div className="mt-3">
          <RealLifeBox text={quest.real_life} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill>{quest.pattern}</Pill>
        {quest.reasons.map((r) => (
          <Pill key={r} className="border-accent/30 text-accent">
            {r}
          </Pill>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <a
          href={quest.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-btn border border-border-strong text-sm hover:bg-surface-2"
        >
          Open <ExternalIcon size={16} />
        </a>
        {quest.done_today ? (
          <DoneMark xp={quest.xp} />
        ) : (
          <button
            type="button"
            onClick={onSolved}
            disabled={busy}
            className="h-11 flex-1 rounded-btn bg-accent font-heading text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Solved it'}
          </button>
        )}
      </div>
    </article>
  )
}
