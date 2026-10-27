import fixtures from '../../../fixtures/dday-cases.json'
import { computeAnniversaries, computeDday, toKstDate } from '../dday'

describe('toKstDate', () => {
  it('UTC 14:59:59Z는 KST 같은 날, 15:00:00Z는 다음 날', () => {
    expect(toKstDate('2024-03-01T14:59:59Z')).toBe('2024-03-01')
    expect(toKstDate('2024-03-01T15:00:00Z')).toBe('2024-03-02')
  })

  it('Date와 epoch ms 입력을 모두 받는다', () => {
    expect(toKstDate(new Date('2023-12-31T15:00:00Z'))).toBe('2024-01-01')
    expect(toKstDate(Date.UTC(2023, 11, 31, 14, 59, 59))).toBe('2023-12-31')
  })

  it('잘못된 시각은 RangeError', () => {
    expect(() => toKstDate('not-a-date')).toThrow(RangeError)
    expect(() => toKstDate(Number.NaN)).toThrow(RangeError)
  })
})

describe('computeDday (fixtures)', () => {
  it('픽스처가 20건 이상이다', () => {
    expect(fixtures.dday.length).toBeGreaterThanOrEqual(20)
  })

  it.each(fixtures.dday.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(computeDday(c.startedOn, c.now)).toEqual(c.expected)
  })

  it('잘못된 사귄 날은 RangeError', () => {
    expect(() => computeDday('2024-02-30', '2024-03-01T00:00:00Z')).toThrow(RangeError)
    expect(() => computeDday('2024/03/01', '2024-03-01T00:00:00Z')).toThrow(RangeError)
    expect(() => computeDday('', '2024-03-01T00:00:00Z')).toThrow(RangeError)
  })
})

describe('computeAnniversaries (fixtures)', () => {
  it.each(fixtures.anniversaries.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(computeAnniversaries(c.input)).toEqual(c.expected)
  })

  it('1주년(다음 해 같은 날짜)과 365일째는 다른 날이다', () => {
    const items = computeAnniversaries({ startedOn: '2024-03-01', customs: [], today: '2025-02-01', horizonDays: 60 })
    expect(items.map((a) => a.date)).toEqual(['2025-03-01'])
    expect(computeDday('2024-03-01', '2025-02-28T03:00:00Z').days).toBe(365)
  })

  it('입력 배열을 변경하지 않는다', () => {
    const customs = Object.freeze([Object.freeze({ id: 'x', title: '기념', date: '2023-01-01' })])
    expect(() => computeAnniversaries({ startedOn: null, customs, today: '2024-01-01', horizonDays: 0 })).not.toThrow()
  })

  it('horizonDays가 음수거나 정수가 아니면 RangeError', () => {
    const base = { startedOn: '2024-03-01', customs: [], today: '2024-03-01' }
    expect(() => computeAnniversaries({ ...base, horizonDays: -1 })).toThrow(RangeError)
    expect(() => computeAnniversaries({ ...base, horizonDays: 1.5 })).toThrow(RangeError)
  })

  it('잘못된 today·커스텀 날짜는 RangeError', () => {
    expect(() =>
      computeAnniversaries({ startedOn: '2024-03-01', customs: [], today: '2024-13-01', horizonDays: 1 }),
    ).toThrow(RangeError)
    expect(() =>
      computeAnniversaries({
        startedOn: null,
        customs: [{ id: 'bad', title: 'x', date: '2023-02-29' }],
        today: '2024-01-01',
        horizonDays: 1,
      }),
    ).toThrow(RangeError)
  })
})
