import { describe, expect, it } from 'vitest'
import { kstDate, kstSlot, kstWeekday, shiftDate, weekdayOf } from './kst.ts'

describe('kstDate', () => {
  it('rolls over to the next day once UTC passes 15:00', () => {
    expect(kstDate(new Date('2026-09-21T14:59:00Z'))).toBe('2026-09-21')
    expect(kstDate(new Date('2026-09-21T15:00:00Z'))).toBe('2026-09-22')
  })
})

describe('kstWeekday', () => {
  it('uses the KST date, not the UTC one', () => {
    // 2026-09-20 is a Sunday. 15:00Z is already Monday in KST.
    expect(kstWeekday(new Date('2026-09-20T14:59:00Z'))).toBe(0)
    expect(kstWeekday(new Date('2026-09-20T15:00:00Z'))).toBe(1)
  })
})

describe('kstSlot', () => {
  it('maps 12:00 UTC to the 21:00 KST slot', () => {
    expect(kstSlot(new Date('2026-09-21T12:00:00Z'), 10)).toBe('21:00')
  })

  it('floors to the cron step so a late run still matches its slot', () => {
    expect(kstSlot(new Date('2026-09-21T12:09:59Z'), 10)).toBe('21:00')
    expect(kstSlot(new Date('2026-09-21T12:10:00Z'), 10)).toBe('21:10')
  })

  it('pads single digit hours', () => {
    expect(kstSlot(new Date('2026-09-20T22:05:00Z'), 10)).toBe('07:00')
  })
})

describe('shiftDate', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDate('2026-09-21', -7)).toBe('2026-09-14')
  })
})

describe('weekdayOf', () => {
  it('returns 0 for Sunday', () => {
    expect(weekdayOf('2026-09-20')).toBe(0)
    expect(weekdayOf('2026-09-21')).toBe(1)
  })
})
