import { formatRelativeTime } from '../format-relative-time'

const NOW = new Date('2026-10-15T12:00:00+09:00')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

describe('formatRelativeTime', () => {
  it.each([
    [ago(20_000), '방금 전'],
    [ago(5 * 60_000), '5분 전'],
    [ago(2 * 3_600_000), '2시간 전'],
    [ago(3 * 86_400_000), '3일 전'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelativeTime(iso, NOW)).toBe(expected)
  })

  it('7일 이상이면 날짜(KST)', () => {
    expect(formatRelativeTime('2026-09-01T03:00:00.000Z', NOW)).toBe('2026.09.01')
  })

  it('미래 시각(기기 시계 차이)은 방금 전', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe('방금 전')
  })
})
