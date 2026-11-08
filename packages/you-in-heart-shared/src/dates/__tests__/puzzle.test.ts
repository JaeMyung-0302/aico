import { puzzleDayDate, puzzleDayIndex, puzzleEndsOn, puzzleProgress } from '../puzzle'

describe('퍼즐 날짜 계산 (하루 = 한 조각, 시작일이 0번 조각)', () => {
  it('끝나는 날은 시작일 + (조각 수 - 1)일', () => {
    expect(puzzleEndsOn('2026-09-27', 100)).toBe('2027-01-04')
    expect(puzzleEndsOn('2026-11-08', 365)).toBe('2027-11-07')
    expect(puzzleEndsOn('2026-11-08', 1)).toBe('2026-11-08')
  })

  it('조각 번호 ↔ 날짜를 서로 되돌린다(윤년 2/29 포함)', () => {
    expect(puzzleDayDate('2028-02-27', 2)).toBe('2028-02-29')
    expect(puzzleDayIndex('2028-02-27', '2028-02-29')).toBe(2)
    expect(puzzleDayIndex('2026-09-27', '2026-09-26')).toBe(-1)
  })

  it('진행: 오늘이 기간 안이면 지난 날 수(오늘 포함), 끝나면 완료', () => {
    expect(puzzleProgress('2026-09-27', 100, '2026-11-08')).toEqual({ elapsed: 43, todayIndex: 42, isComplete: false })
    expect(puzzleProgress('2026-09-27', 100, '2027-01-04')).toEqual({ elapsed: 100, todayIndex: 99, isComplete: false })
    expect(puzzleProgress('2026-09-27', 100, '2027-01-05')).toEqual({
      elapsed: 100,
      todayIndex: null,
      isComplete: true,
    })
    expect(puzzleProgress('2026-11-10', 100, '2026-11-08')).toEqual({ elapsed: 0, todayIndex: null, isComplete: false })
  })

  it('잘못된 날짜·조각 수는 RangeError', () => {
    expect(() => puzzleEndsOn('2026-02-30', 10)).toThrow(RangeError)
    expect(() => puzzleEndsOn('2026-02-01', 0)).toThrow(RangeError)
    expect(() => puzzleDayDate('2026-02-01', 1.5)).toThrow(RangeError)
  })
})
