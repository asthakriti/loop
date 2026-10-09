import { api } from './client'

export type Badge = { code: string; name: string; description: string }
export type BadgeStatus = Badge & { unlocked: boolean; unlocked_on: string | null }

export function getBadges() {
  return api<BadgeStatus[]>('/badges')
}
