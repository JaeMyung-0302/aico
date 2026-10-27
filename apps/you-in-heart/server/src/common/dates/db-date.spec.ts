import { fromDbDate, toDbDate } from './db-date'

describe('db-date (@db.Date ↔ YYYY-MM-DD)', () => {
  it('YYYY-MM-DD를 UTC 자정 Date로 만들고 그대로 되돌린다(타임존 이동 없음)', () => {
    expect(toDbDate('2024-02-29').toISOString()).toBe('2024-02-29T00:00:00.000Z')
    expect(fromDbDate(toDbDate('2024-02-29'))).toBe('2024-02-29')
    expect(fromDbDate(new Date('2025-12-31T00:00:00.000Z'))).toBe('2025-12-31')
  })

  it.each(['2025-02-30', '2025-1-01', '20250101', '2025-01-01T00:00:00Z', ''])('%s는 RangeError', (value) => {
    expect(() => toDbDate(value)).toThrow(RangeError)
  })
})
