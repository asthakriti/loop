import { api } from './client'

export type Stats = {
  total_solved: number
  solved_per_pattern: { pattern: string; solved: number }[]
  round: { number: number; revised: number; total: number }
  milestone: { target: number; to_go: number }
}

export function getStats() {
  return api<Stats>('/stats')
}
