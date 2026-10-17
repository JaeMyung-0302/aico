import { describe, expect, it } from 'vitest'
import { predictFromHistory, type HistoryLog } from './predict.ts'

const gymChest = (loggedOn: string): HistoryLog => ({
  loggedOn,
  answer: { kind: 'gym', parts: ['chest'], intensity: 'mid' },
})
const rest = (loggedOn: string): HistoryLog => ({ loggedOn, answer: { kind: 'rest' } })

describe('predictFromHistory', () => {
  it('returns null with fewer than two same-weekday logs', () => {
    expect(predictFromHistory([])).toBeNull()
    expect(predictFromHistory([gymChest('2026-09-21')])).toBeNull()
  })

  it('returns the most frequent answer', () => {
    const logs = [gymChest('2026-09-21'), rest('2026-09-14'), gymChest('2026-09-07')]
    expect(predictFromHistory(logs)).toEqual({ kind: 'gym', parts: ['chest'], intensity: 'mid' })
  })

  it('returns null when no answer repeats', () => {
    expect(predictFromHistory([gymChest('2026-09-21'), rest('2026-09-14')])).toBeNull()
  })

  it('breaks ties toward the more recent answer', () => {
    const logs = [rest('2026-09-21'), rest('2026-09-14'), gymChest('2026-09-07'), gymChest('2026-08-31')]
    expect(predictFromHistory(logs)?.kind).toBe('rest')
  })

  it('treats different part sets as different answers', () => {
    const chestLegs: HistoryLog = {
      loggedOn: '2026-09-14',
      answer: { kind: 'gym', parts: ['chest', 'legs'], intensity: 'mid' },
    }
    expect(predictFromHistory([gymChest('2026-09-21'), chestLegs])).toBeNull()
  })

  it('works for any track shape', () => {
    const sleep = (loggedOn: string): HistoryLog => ({ loggedOn, answer: { hours: 'h7to8', fresh: 'high' } })
    expect(predictFromHistory([sleep('2026-09-21'), sleep('2026-09-14')])).toEqual({ hours: 'h7to8', fresh: 'high' })
  })
})
