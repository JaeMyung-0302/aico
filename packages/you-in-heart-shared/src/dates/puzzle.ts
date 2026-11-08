// 우리 퍼즐 날짜 계산 (서버·앱 공용). 하루 = 한 조각, 시작일이 0번 조각, 날짜는 KST 'YYYY-MM-DD'
const DAY_MS = 86_400_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type PuzzleProgress = {
  // 시작일부터 오늘까지(오늘 포함) 지난 날 수. 시작 전이면 0, 끝나면 조각 수
  elapsed: number
  // 오늘 칸 번호. 기간 밖이면 null
  todayIndex: number | null
  isComplete: boolean
}

const toDayNumber = (ymd: string): number => {
  const ms = Date.parse(`${ymd}T00:00:00.000Z`)
  if (!DATE_PATTERN.test(ymd) || Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== ymd) {
    throw new RangeError(`잘못된 날짜: ${ymd}`)
  }
  return ms / DAY_MS
}

const fromDayNumber = (dayNumber: number): string => new Date(dayNumber * DAY_MS).toISOString().slice(0, 10)

const assertCount = (pieceCount: number): void => {
  if (!Number.isInteger(pieceCount) || pieceCount < 1) throw new RangeError(`잘못된 조각 수: ${pieceCount}`)
}

export const puzzleDayDate = (startsOn: string, dayIndex: number): string => {
  if (!Number.isInteger(dayIndex)) throw new RangeError(`잘못된 조각 번호: ${dayIndex}`)
  return fromDayNumber(toDayNumber(startsOn) + dayIndex)
}

export const puzzleDayIndex = (startsOn: string, date: string): number => toDayNumber(date) - toDayNumber(startsOn)

export const puzzleEndsOn = (startsOn: string, pieceCount: number): string => {
  assertCount(pieceCount)
  return puzzleDayDate(startsOn, pieceCount - 1)
}

export const puzzleProgress = (startsOn: string, pieceCount: number, today: string): PuzzleProgress => {
  assertCount(pieceCount)
  const index = puzzleDayIndex(startsOn, today)
  if (index >= pieceCount) return { elapsed: pieceCount, todayIndex: null, isComplete: true }
  if (index < 0) return { elapsed: 0, todayIndex: null, isComplete: false }
  return { elapsed: index + 1, todayIndex: index, isComplete: false }
}
