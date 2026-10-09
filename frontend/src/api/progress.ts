import { api } from './client'

export type Progress = {
  total_xp: number
  level: number
  level_name: string
  level_xp: number
  next_level_xp: number | null
  current_streak: number
  best_streak: number
  week: { day: string; done: boolean }[]
  round: { number: number; revised: number; total: number }
}

export function getProgress() {
  return api<Progress>('/me/progress')
}
