import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBadges, type BadgeStatus } from '../api/badges'
import { getPatterns, type PatternInfo } from '../api/patterns'
import { getStats, type Stats } from '../api/stats'
import { addProblem, getToday, markDone, type DoneResult, type Section, type Today as TodayData } from '../api/today'
import { DailyByte } from '../components/DailyByte'
import { LoopArrowIcon, SparkIcon, SunIcon } from '../components/icons'
import { LevelCard } from '../components/LevelCard'
import { NewQuestCard, QuestRow, QuestSection } from '../components/Quests'
import { BadgeGrid, MilestoneCard, PatternGaps } from '../components/SideCards'
import { StreakCard } from '../components/StreakCard'
import { ToastList, useToasts } from '../components/Toasts'
import { useProgress } from '../state/ProgressContext'

export function cheer(done: number, total: number): string {
  if (total === 0) return 'Nothing due today. Add some solved problems to start.'
  if (done === 0) return "Let's get the first one."
  if (done === total) return 'All done. See you tomorrow!'
  if (done / total >= 0.5) return 'More than halfway there.'
  return 'Nice start. Keep going.'
}

function dateLabel(now: Date) {
  return now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function Today() {
  const { progress, refresh: refreshProgress } = useProgress()
  const [today, setToday] = useState<TodayData | null>(null)
  const [badges, setBadges] = useState<BadgeStatus[]>([])
  const [patterns, setPatterns] = useState<PatternInfo[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null) // which button is saving
  const { toasts, push } = useToasts()

  const loadAll = useCallback(async () => {
    try {
      const [t, b, p, s] = await Promise.all([getToday(), getBadges(), getPatterns(), getStats()])
      setToday(t)
      setBadges(b)
      setPatterns(p)
      setStats(s)
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load today.')
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // After a 'done': show toasts, then refresh only what changed (no full page reload).
  async function afterDone(result: DoneResult, solvedNew: boolean) {
    push(`+${result.xp_earned} XP`, 'xp')
    for (const badge of result.new_badges) push(`Badge unlocked: ${badge.name}`, 'badge')
    if (result.all_done) push(`All quests cleared · ${result.streak}-day streak`, 'win')

    const jobs: Promise<unknown>[] = [getToday().then(setToday), refreshProgress()]
    if (result.new_badges.length) jobs.push(getBadges().then(setBadges))
    if (solvedNew) jobs.push(getPatterns().then(setPatterns), getStats().then(setStats))
    await Promise.all(jobs)
  }

  async function clear(id: number, section: Section) {
    setBusyKey(`${section}-${id}`)
    try {
      await afterDone(await markDone(id, section), false)
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save.', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  // "Solved it" = add the problem to my list, then mark it done as a new quest (+30 XP).
  async function solve(slug: string) {
    setBusyKey(`new-${slug}`)
    try {
      const added = await addProblem(slug)
      await afterDone(await markDone(added.id, 'new'), true)
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save.', 'error')
    } finally {
      setBusyKey(null)
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="rounded-card border border-coral/30 bg-coral/10 p-5 text-coral">
        {loadError}
      </p>
    )
  }
  if (!today || !progress || !stats) {
    return <p className="text-muted">Loading today…</p>
  }

  const items = [...today.warmup, ...today.loop, ...today.new]
  const maxXpToday = items.reduce((sum, i) => sum + i.xp, 0)
  const allCleared = today.total_count > 0 && today.done_count === today.total_count

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- Hero ---------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">{dateLabel(new Date())}</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Keep the loop going.</h1>
            <p className="mt-3 text-muted">
              <span className="text-text">
                {today.done_count} of {today.total_count}
              </span>{' '}
              quests cleared today. {cheer(today.done_count, today.total_count)}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LevelCard progress={progress} />
            <StreakCard progress={progress} />
          </div>
        </div>
        <DailyByte />
      </div>

      {/* ---------- Strip ---------- */}
      {allCleared ? (
        <p className="rounded-card border border-accent/30 bg-accent/10 px-5 py-3 font-heading font-semibold text-accent">
          +{today.xp_today} XP · All quests cleared
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-5 py-3">
          <p className="italic text-muted">“You don’t forget what you keep coming back to.”</p>
          <p className="font-mono text-sm text-lavender">
            {today.xp_today} / {maxXpToday} XP today
          </p>
        </div>
      )}

      {/* ---------- Main + side ---------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {today.total_count === 0 && (
            <p className="rounded-card border border-border bg-surface p-5 text-muted">
              Your line is empty. Go to{' '}
              <Link to="/problems" className="text-accent hover:underline">
                My problems
              </Link>{' '}
              and import your solved list.
            </p>
          )}

          {today.warmup.length > 0 && (
            <QuestSection
              id="warmup-heading"
              title="Warm-up"
              subtitle="Solved yesterday. One quick look before it fades."
              xpEach={10}
              icon={<SunIcon />}
              tone="bg-amber/15 text-amber"
            >
              {today.warmup.map((item) => (
                <QuestRow key={item.id} item={item} busy={busyKey === `warmup-${item.id}`} onClear={() => clear(item.id, 'warmup')} />
              ))}
            </QuestSection>
          )}

          {today.loop.length > 0 && (
            <QuestSection
              id="loop-heading"
              title="The Loop"
              subtitle={`${today.daily_count} from the front of the line`}
              xpEach={15}
              icon={<LoopArrowIcon />}
              tone="bg-lavender/15 text-lavender"
            >
              {today.warning && (
                <p className="rounded-btn border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber">{today.warning}</p>
              )}
              {today.loop.map((item) => (
                <QuestRow key={item.id} item={item} busy={busyKey === `loop-${item.id}`} onClear={() => clear(item.id, 'loop')} />
              ))}
            </QuestSection>
          )}

          {today.new.length > 0 && (
            <QuestSection
              id="new-heading"
              title="New quests"
              subtitle="Picked for you by priority"
              xpEach={30}
              icon={<SparkIcon />}
              tone="bg-accent/15 text-accent"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {today.new.map((quest) => (
                  <NewQuestCard key={quest.slug} quest={quest} busy={busyKey === `new-${quest.slug}`} onSolved={() => solve(quest.slug)} />
                ))}
              </div>
            </QuestSection>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <MilestoneCard stats={stats} />
          <BadgeGrid badges={badges} />
          <PatternGaps patterns={patterns} />
        </aside>
      </div>

      <ToastList toasts={toasts} />
    </div>
  )
}
