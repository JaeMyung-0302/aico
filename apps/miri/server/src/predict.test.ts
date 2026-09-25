import { describe, expect, it } from 'vitest'
import { dailyQuestionText, predictFromHistory, type HistoryLog } from './predict.ts'

const gymChest = (loggedOn: string): HistoryLog => ({
  loggedOn,
  kind: 'gym',
  parts: ['chest'],
  intensity: 'normal',
})
const rest = (loggedOn: string): HistoryLog => ({ loggedOn, kind: 'rest', parts: [], intensity: null })

describe('predictFromHistory', () => {
  it('returns null with fewer than two same-weekday logs', () => {
    expect(predictFromHistory([])).toBeNull()
    expect(predictFromHistory([gymChest('2026-09-21')])).toBeNull()
  })

  it('returns the most frequent combo', () => {
    const logs = [gymChest('2026-09-21'), rest('2026-09-14'), gymChest('2026-09-07')]
    expect(predictFromHistory(logs)).toEqual({ kind: 'gym', parts: ['chest'], intensity: 'normal' })
  })

  it('returns null when no combo repeats', () => {
    const logs = [gymChest('2026-09-21'), rest('2026-09-14')]
    expect(predictFromHistory(logs)).toBeNull()
  })

  it('breaks ties toward the more recent combo', () => {
    const logs = [rest('2026-09-21'), rest('2026-09-14'), gymChest('2026-09-07'), gymChest('2026-08-31')]
    expect(predictFromHistory(logs)?.kind).toBe('rest')
  })

  it('treats different part sets as different combos', () => {
    const chestLegs: HistoryLog = { ...gymChest('2026-09-14'), parts: ['chest', 'legs'] }
    expect(predictFromHistory([gymChest('2026-09-21'), chestLegs])).toBeNull()
  })
})

describe('dailyQuestionText', () => {
  it('asks openly without a prediction', () => {
    expect(dailyQuestionText(null)).toBe('오늘 몸 어떻게 썼어요?')
  })

  it('asks to confirm the predicted entry', () => {
    expect(dailyQuestionText({ kind: 'gym', parts: ['chest', 'legs'], intensity: 'hard' })).toBe(
      '오늘도 헬스, 가슴 하체, 빡셈?',
    )
    expect(dailyQuestionText({ kind: 'rest', parts: [], intensity: null })).toBe('오늘도 쉼?')
  })
})
