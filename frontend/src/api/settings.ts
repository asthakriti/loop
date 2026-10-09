import { api } from './client'

export type Settings = {
  round_days: number
  max_daily: number
  new_per_day: number
  target_company: string | null
}

export function getSettings() {
  return api<Settings>('/settings')
}

export function saveSettings(settings: Settings) {
  return api<Settings>('/settings', { method: 'PUT', body: settings })
}
