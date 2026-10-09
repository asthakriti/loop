import { api } from './client'
import { toQuery } from './constants'

export type BankProblem = {
  id: number
  title: string
  slug: string
  link: string
  topic: string | null
  pattern: string
  difficulty: string
  companies: string[]
  sources: string[]
  is_design: boolean
  is_custom: boolean
  real_life: string | null
  solved: boolean
  priority: number | null
  reasons: string[]
}

export type BankPage = { items: BankProblem[]; total: number; page: number; page_size: number }

export type BankFilters = {
  q?: string
  pattern?: string
  company?: string
  difficulty?: string
  is_design?: boolean
  page?: number
  page_size?: number
}

export function listBank(filters: BankFilters = {}) {
  return api<BankPage>(`/bank${toQuery({ sort: 'priority', ...filters })}`)
}
