import {
  MAX_PUZZLE_PIECES,
  MIN_PUZZLE_PIECES,
  type PuzzleDetail,
  type PuzzlePiece,
  puzzleDayIndex,
  puzzleProgress,
} from '@you-in-heart/shared'

const YEAR_PIECES = 365

export const puzzleTitle = (pieceCount: number): string =>
  pieceCount === YEAR_PIECES ? '1년 퍼즐' : `${pieceCount}일 퍼즐`

export type PuzzleView = {
  title: string
  ddayLabel: string
  isComplete: boolean
  // 오늘 칸 번호(기간 밖이면 null)
  todayIndex: number | null
  isTodayFilled: boolean
  // 오늘을 뺀 지난 날 중 아직 조각이 없는 날 수(지난 날 채우기 안내)
  emptyPastCount: number
  // 날짜가 지난 칸 수(오늘 포함) — 이보다 뒤 칸은 아직 오지 않은 날
  elapsed: number
  pieceByIndex: Map<number, PuzzlePiece>
}

export const describePuzzle = (puzzle: PuzzleDetail, today: string): PuzzleView => {
  const progress = puzzleProgress(puzzle.startsOn, puzzle.pieceCount, today)
  const isComplete = puzzle.status === 'COMPLETED' || progress.isComplete
  const pieceByIndex = new Map(puzzle.pieces.map((piece) => [piece.dayIndex, piece]))
  const isTodayFilled = progress.todayIndex !== null && pieceByIndex.has(progress.todayIndex)
  const pastDays = progress.todayIndex === null ? progress.elapsed : progress.todayIndex
  const filledPast = puzzle.pieces.filter((piece) => piece.dayIndex < pastDays).length
  const daysLeft = puzzleDayIndex(today, puzzle.endsOn)
  return {
    title: puzzleTitle(puzzle.pieceCount),
    ddayLabel: isComplete ? '완성' : daysLeft === 0 ? 'D-day' : `D-${daysLeft}`,
    isComplete,
    todayIndex: isComplete ? null : progress.todayIndex,
    isTodayFilled,
    emptyPastCount: pastDays - filledPast,
    elapsed: progress.elapsed,
    pieceByIndex,
  }
}

export type PeriodOption = { key: string; label: string; pieceCount: number }

// SCR-19b 기간 선택. 다음 기념일까지는 오늘부터 그 날까지(양끝 포함) 조각 수가 범위 안일 때만
export const periodOptions = (
  today: string,
  nextAnniversary: { title: string; date: string } | null,
): PeriodOption[] => {
  const base: PeriodOption[] = [
    { key: '100', label: '100일', pieceCount: 100 },
    { key: '365', label: '1년', pieceCount: YEAR_PIECES },
  ]
  if (!nextAnniversary) return base
  const pieceCount = puzzleDayIndex(today, nextAnniversary.date) + 1
  const isInRange = pieceCount >= MIN_PUZZLE_PIECES && pieceCount <= MAX_PUZZLE_PIECES
  return isInRange ? [...base, { key: 'next', label: `${nextAnniversary.title}까지`, pieceCount }] : base
}
