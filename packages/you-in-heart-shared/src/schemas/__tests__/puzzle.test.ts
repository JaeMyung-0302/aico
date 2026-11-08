import { MAX_PUZZLE_PIECES, MIN_PUZZLE_PIECES } from '../../constants/limits'
import { createPuzzleRequestSchema, puzzleDetailSchema, puzzleListResponseSchema } from '../puzzle'

const ID = '0192f1a4-7c3e-7a1b-9c2d-1e2f3a4b5c6d'

const summary = {
  id: ID,
  startsOn: '2026-09-27',
  endsOn: '2027-01-04',
  pieceCount: 100,
  filledCount: 31,
  status: 'ACTIVE' as const,
  backgroundUrl: 'https://storage.example/bg.jpg',
  createdAt: '2026-09-27T01:00:00.000Z',
}

describe('puzzle', () => {
  it('조각 수는 정수이고 범위 안이어야 한다', () => {
    expect(createPuzzleRequestSchema.safeParse({ backgroundPhotoId: ID, pieceCount: 100 }).success).toBe(true)
    expect(createPuzzleRequestSchema.safeParse({ backgroundPhotoId: ID, pieceCount: MIN_PUZZLE_PIECES }).success).toBe(
      true,
    )
    expect(createPuzzleRequestSchema.safeParse({ backgroundPhotoId: ID, pieceCount: MAX_PUZZLE_PIECES }).success).toBe(
      true,
    )
    expect(
      createPuzzleRequestSchema.safeParse({ backgroundPhotoId: ID, pieceCount: MIN_PUZZLE_PIECES - 1 }).success,
    ).toBe(false)
    expect(
      createPuzzleRequestSchema.safeParse({ backgroundPhotoId: ID, pieceCount: MAX_PUZZLE_PIECES + 1 }).success,
    ).toBe(false)
    expect(createPuzzleRequestSchema.safeParse({ backgroundPhotoId: ID, pieceCount: 10.5 }).success).toBe(false)
    expect(createPuzzleRequestSchema.safeParse({ backgroundPhotoId: 'x', pieceCount: 100 }).success).toBe(false)
  })

  it('퍼즐판 사진이 지워지면 backgroundUrl은 null', () => {
    const detail = { ...summary, backgroundUrl: null, pieces: [] }
    expect(puzzleDetailSchema.safeParse(detail).success).toBe(true)
  })

  it('조각은 dayIndex·날짜·일기·썸네일을 담는다', () => {
    const piece = { dayIndex: 0, date: '2026-09-27', entryId: ID, thumbUrl: 'https://storage.example/t.jpg' }
    expect(puzzleDetailSchema.safeParse({ ...summary, pieces: [piece] }).success).toBe(true)
    expect(puzzleDetailSchema.safeParse({ ...summary, pieces: [{ ...piece, dayIndex: -1 }] }).success).toBe(false)
  })

  it('목록은 지금 맞추는 퍼즐(없으면 null)과 완성한 퍼즐들', () => {
    expect(puzzleListResponseSchema.safeParse({ current: null, completed: [] }).success).toBe(true)
    expect(
      puzzleListResponseSchema.safeParse({
        current: { ...summary, pieces: [] },
        completed: [{ ...summary, status: 'COMPLETED' }],
      }).success,
    ).toBe(true)
  })
})
