import { api } from './client'

export type Suggestion = {
  slug: string
  title: string
  link: string
  pattern: string
  difficulty: string
  real_life: string | null
  score: number
  priority: number
  reasons: string[]
}

export type PatternInfo = {
  pattern: string
  solved: number
  total: number
  status: 'covered' | 'in progress' | 'not started'
  next: Suggestion | null
}

export function getPatterns() {
  return api<PatternInfo[]>('/patterns')
}
