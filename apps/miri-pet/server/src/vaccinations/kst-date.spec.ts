import { addDays, daysBetween, fromDbDate, kstHour, kstToday, toDbDate } from './kst-date'

describe('kst-date', () => {
  describe('kstToday', () => {
    it('UTC 2026-10-13T14:59Z는 KST 10-13', () => {
      expect(kstToday(new Date('2026-10-13T14:59:59.999Z'))).toBe('2026-10-13')
    })

    it('UTC 2026-10-13T15:00Z는 KST 10-14 (자정 경계)', () => {
      expect(kstToday(new Date('2026-10-13T15:00:00.000Z'))).toBe('2026-10-14')
    })

    it('연말 경계: UTC 12-31T15:00Z는 KST 다음 해 1월 1일', () => {
      expect(kstToday(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01')
    })
  })

  describe('kstHour', () => {
    it('UTC 01:00Z는 KST 10시', () => {
      expect(kstHour(new Date('2026-10-13T01:00:00Z'))).toBe(10)
    })

    it('UTC 15:30Z는 KST 0시(다음 날)', () => {
      expect(kstHour(new Date('2026-10-13T15:30:00Z'))).toBe(0)
    })
  })

  describe('addDays', () => {
    it('월말을 넘긴다', () => {
      expect(addDays('2026-10-28', 7)).toBe('2026-11-04')
    })

    it('윤년 2월 29일', () => {
      expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    })

    it('음수도 받는다', () => {
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    })
  })

  describe('daysBetween', () => {
    it('같은 날이면 0, 7일 뒤면 7', () => {
      expect(daysBetween('2026-10-13', '2026-10-13')).toBe(0)
      expect(daysBetween('2026-10-13', '2026-10-20')).toBe(7)
    })
  })

  describe('DB DATE 변환', () => {
    it('ISO 날짜 → UTC 자정 Date → 다시 같은 ISO 날짜', () => {
      const date = toDbDate('2026-10-20')
      expect(date.toISOString()).toBe('2026-10-20T00:00:00.000Z')
      expect(fromDbDate(date)).toBe('2026-10-20')
    })

    it('잘못된 날짜 문자열은 예외', () => {
      expect(() => toDbDate('2026-13-40')).toThrow()
    })
  })
})
