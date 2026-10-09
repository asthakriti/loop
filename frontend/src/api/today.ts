import type { Badge } from './badges'
import { api } from './client'

export type Section = 'warmup' | 'loop' | 'new'

export type TodayItem = {
  id: number // user_problem id
  title: string
  link: string
  pattern: string
  difficulty: string
  notes: string | null
  real_life: string | null
  last_revised_on: string | null
  done_today: boolean
  xp: number
}

export type NewQuestItem = {
  id: number | null // set once solved
  slug: string
  title: string
  link: string
  pattern: string
  difficulty: string
  real_life: string | null
  score: number
  priority: number // 1-10
  reasons: string[]
  done_today: boolean
  xp: number
}

export type Today = {
  warmup: TodayItem[]
  loop: TodayItem[]
  new: NewQuestItem[]
  daily_count: number
  warning: string | null
  done_count: number
  total_count: number
  xp_today: number
}

export type DoneResult = {
  xp_earned: number
  total_xp: number
  level: number
  level_name: string
  streak: number
  all_done: boolean
  new_badges: Badge[]
}

export function getToday() {
  return api<Today>('/today')
}

export function markDone(userProblemId: number, section: Section) {
  return api<DoneResult>(`/my/problems/${userProblemId}/done`, { method: 'POST', body: { section } })
}

export function addProblem(slug: string) {
  return api<{ id: number }>('/my/problems', { method: 'POST', body: { slug } })
}
