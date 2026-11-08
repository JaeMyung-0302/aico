import type { PuzzleDetail } from '@you-in-heart/shared'
import { describePuzzle, periodOptions, puzzleTitle } from '../util-puzzle/puzzle-view'

const ID = '0192f1a4-7c3e-7a1b-9c2d-1e2f3a4b5c6d'
const piece = (dayIndex: number, date: string) => ({ dayIndex, date, entryId: ID, thumbUrl: 'https://x/t.jpg' })

const detail = (overrides: Partial<PuzzleDetail> = {}): PuzzleDetail => ({
  id: ID,
  startsOn: '2026-09-27',
  endsOn: '2027-01-04',
  pieceCount: 100,
  filledCount: 2,
  status: 'ACTIVE',
  backgroundUrl: null,
  createdAt: '2026-09-27T01:00:00.000Z',
  pieces: [piece(0, '2026-09-27'), piece(42, '2026-11-08')],
  ...overrides,
})

describe('puzzle-view', () => {
  it('제목: 365조각은 1년, 나머지는 N일', () => {
    expect(puzzleTitle(365)).toBe('1년 퍼즐')
    expect(puzzleTitle(100)).toBe('100일 퍼즐')
  })

  it('맞추는 중: 남은 날(D-N), 비어 있는 지난 날(오늘 제외), 오늘 칸', () => {
    const view = describePuzzle(detail(), '2026-11-08')
    expect(view.ddayLabel).toBe('D-57')
    expect(view.todayIndex).toBe(42)
    expect(view.isTodayFilled).toBe(true)
    expect(view.emptyPastCount).toBe(41)
    expect(view.pieceByIndex.get(0)?.date).toBe('2026-09-27')
    expect(view.isComplete).toBe(false)
  })

  it('마지막 날은 D-day, 기간이 지나면 완성', () => {
    expect(describePuzzle(detail(), '2027-01-04').ddayLabel).toBe('D-day')
    const done = describePuzzle(detail({ status: 'COMPLETED' }), '2027-02-01')
    expect(done.isComplete).toBe(true)
    expect(done.ddayLabel).toBe('완성')
    expect(done.todayIndex).toBeNull()
    expect(done.emptyPastCount).toBe(98)
  })

  it('기간 선택지: 100일·1년, 다음 기념일까지(범위 안일 때만)', () => {
    expect(periodOptions('2026-11-08', { title: '500일', date: '2027-02-10' })).toEqual([
      { key: '100', label: '100일', pieceCount: 100 },
      { key: '365', label: '1년', pieceCount: 365 },
      { key: 'next', label: '500일까지', pieceCount: 95 },
    ])
    expect(periodOptions('2026-11-08', { title: '내일', date: '2026-11-09' })).toHaveLength(2)
    expect(periodOptions('2026-11-08', null)).toHaveLength(2)
  })
})
