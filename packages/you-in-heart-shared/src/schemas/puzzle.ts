import { z } from 'zod'
import { MAX_PUZZLE_PIECES, MIN_PUZZLE_PIECES } from '../constants/limits'
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common'

// 오늘이 끝나는 날을 지나면 COMPLETED(빈 칸이 있어도 기간이 끝나면 완성으로 보관)
export const puzzleStatusSchema = z.enum(['ACTIVE', 'COMPLETED'])
export type PuzzleStatus = z.infer<typeof puzzleStatusSchema>

// 조각 = 그 날(startsOn + dayIndex) 일기의 첫 사진. 일기를 지우면 조각도 사라진다
export const puzzlePieceSchema = z.object({
  dayIndex: z.number().int().min(0),
  date: isoDateSchema,
  entryId: idSchema,
  thumbUrl: z.string(),
})
export type PuzzlePiece = z.infer<typeof puzzlePieceSchema>

export const puzzleSummarySchema = z.object({
  id: idSchema,
  startsOn: isoDateSchema,
  endsOn: isoDateSchema,
  pieceCount: z.number().int().positive(),
  filledCount: z.number().int().min(0),
  status: puzzleStatusSchema,
  // 퍼즐판 사진(표시용 서명 URL). 사진이 지워지면 null
  backgroundUrl: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})
export type PuzzleSummary = z.infer<typeof puzzleSummarySchema>

export const puzzleDetailSchema = puzzleSummarySchema.extend({ pieces: z.array(puzzlePieceSchema) })
export type PuzzleDetail = z.infer<typeof puzzleDetailSchema>

// GET /puzzles — 맞추는 중인 퍼즐(한 번에 하나)과 완성한 퍼즐들(최근 순)
export const puzzleListResponseSchema = z.object({
  current: puzzleDetailSchema.nullable(),
  completed: z.array(puzzleSummarySchema),
})
export type PuzzleListResponse = z.infer<typeof puzzleListResponseSchema>

// POST /puzzles — 시작일은 서버가 오늘(KST)로 정한다. 퍼즐판 사진은 같은 커플의 READY 사진만
export const createPuzzleRequestSchema = z.object({
  backgroundPhotoId: idSchema,
  pieceCount: z.number().int().min(MIN_PUZZLE_PIECES).max(MAX_PUZZLE_PIECES),
})
export type CreatePuzzleRequest = z.infer<typeof createPuzzleRequestSchema>
