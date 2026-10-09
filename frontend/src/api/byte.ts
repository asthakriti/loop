import { api } from './client'

export type ByteType = 'code' | 'fact'

export type DailyByte = {
  id: number
  type: ByteType
  title: string
  content: string
  why_it_matters: string
  topic: string | null
}

// offset 0 = today's byte, 1 = the next one in line, ...
export function getByte(type: ByteType, offset = 0) {
  return api<DailyByte>(`/byte/today?type=${type}&offset=${offset}`)
}
