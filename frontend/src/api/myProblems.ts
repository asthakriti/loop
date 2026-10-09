import { api } from './client'
import { toQuery } from './constants'

export type Status = 'new' | 'in_queue' | 'retired'

export type MyProblem = {
  id: number
  problem_id: number
  slug: string
  title: string
  link: string
  pattern: string
  difficulty: string
  is_custom: boolean
  real_life: string | null
  status: Status
  solved_on: string
  last_revised_on: string | null
  times_revised: number
  notes: string | null
}

export type MyFilters = { q?: string; pattern?: string; status?: string; difficulty?: string }

export type ImportResult = { created: number; skipped: number; custom_created: number; missing: string[] }

export function listMyProblems(filters: MyFilters = {}) {
  return api<MyProblem[]>(`/my/problems${toQuery(filters)}`)
}

export function updateNotes(id: number, notes: string | null) {
  return api<MyProblem>(`/my/problems/${id}`, { method: 'PUT', body: { notes } })
}

export function retireProblem(id: number) {
  return api<MyProblem>(`/my/problems/${id}/retire`, { method: 'POST' })
}

export function deleteProblem(id: number) {
  return api<void>(`/my/problems/${id}`, { method: 'DELETE' })
}

export function importSolvedCsv(file: File) {
  const form = new FormData()
  form.append('file', file)
  return api<ImportResult>('/my/problems/import', { method: 'POST', formData: form })
}
