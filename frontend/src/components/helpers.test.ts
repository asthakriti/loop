import { describe, expect, it } from 'vitest'
import { cheer } from '../pages/Today'
import { daysAgo, lastSeenText } from './bits'
import { levelPercent } from './LevelCard'
import { whyLine } from './Quests'

const NOW = new Date(2026, 2, 10) // 10 March 2026, local time

describe('small helpers', () => {
  it('levelPercent: progress inside the current level', () => {
    expect(levelPercent({ total_xp: 0, level_xp: 0, next_level_xp: 100 })).toBe(0)
    expect(levelPercent({ total_xp: 1350, level_xp: 1200, next_level_xp: 1500 })).toBe(50)
    expect(levelPercent({ total_xp: 3000, level_xp: 2400, next_level_xp: null })).toBe(100)
  })

  it('daysAgo and lastSeenText', () => {
    expect(daysAgo('2026-03-07', NOW)).toBe(3)
    expect(lastSeenText(null, NOW)).toBe('Never revised')
    expect(lastSeenText('2026-03-10', NOW)).toBe('Seen today')
    expect(lastSeenText('2026-03-09', NOW)).toBe('Last seen yesterday')
    expect(lastSeenText('2026-02-08', NOW)).toBe('Last seen 30 days ago')
  })

  it('whyLine turns reason tags into a sentence', () => {
    expect(whyLine(['Fresher topic', 'Amazon', 'Blind 75'])).toBe('Asked by Amazon, in Blind 75.')
    expect(whyLine(['Design', 'New pattern'])).toBe('Fills a pattern gap, build it from scratch.')
    expect(whyLine([])).toBe('A good next step for you.')
  })

  it('cheer changes with progress', () => {
    expect(cheer(0, 0)).toMatch(/Nothing due/)
    expect(cheer(0, 5)).toBe("Let's get the first one.")
    expect(cheer(3, 5)).toBe('More than halfway there.')
    expect(cheer(5, 5)).toBe('All done. See you tomorrow!')
  })
})
