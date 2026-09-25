import { describe, expect, it } from 'vitest'
import type { Entry } from './domain.ts'
import { summarizeWeek } from './summary.ts'

const gym = (parts: Entry['parts']): Entry => ({ kind: 'gym', parts, intensity: 'normal' })
const cardio: Entry = { kind: 'cardio', parts: [], intensity: 'easy' }
const rest: Entry = { kind: 'rest', parts: [], intensity: null }

describe('summarizeWeek', () => {
  it('says so when the week is empty', () => {
    const summary = summarizeWeek([])
    expect(summary.text).toBe('이번 주는 기록이 없었어요. 오늘부터 다시 시작해요')
    expect(summary.kindCounts.gym).toBe(0)
  })

  it('lists only kinds that happened when there was no gym', () => {
    expect(summarizeWeek([cardio, rest, rest]).text).toBe('이번 주 유산소 1번, 쉼 2번')
  })

  it('names the missed parts after gym days', () => {
    const summary = summarizeWeek([gym(['chest']), gym(['back', 'chest']), cardio])
    expect(summary.partCounts).toEqual({ chest: 2, back: 1, legs: 0, shoulders_arms: 0 })
    expect(summary.text).toBe('이번 주 헬스 2번, 유산소 1번. 하체, 어깨팔은 없었어요')
  })

  it('uses the singular particle for one missed part', () => {
    const summary = summarizeWeek([gym(['chest', 'back', 'shoulders_arms'])])
    expect(summary.text).toBe('이번 주 헬스 1번. 하체는 없었어요')
  })

  it('celebrates when all four parts were covered', () => {
    const summary = summarizeWeek([gym(['chest', 'back']), gym(['legs', 'shoulders_arms'])])
    expect(summary.text).toBe('이번 주 헬스 2번. 네 부위 다 챙겼어요')
  })
})
