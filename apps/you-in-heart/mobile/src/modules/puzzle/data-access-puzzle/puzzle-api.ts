import {
  type CreatePuzzleRequest,
  type PuzzleDetail,
  puzzleDetailSchema,
  type PuzzleListResponse,
  puzzleListResponseSchema,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// GET /puzzles — 맞추는 중인 퍼즐(조각 포함)과 완성한 퍼즐들
export const fetchPuzzles = (): Promise<PuzzleListResponse> =>
  requestApi({ method: 'GET', url: '/puzzles', schema: puzzleListResponseSchema })

export const fetchPuzzle = (id: string): Promise<PuzzleDetail> =>
  requestApi({ method: 'GET', url: `/puzzles/${encodeURIComponent(id)}`, schema: puzzleDetailSchema })

// 시작일은 서버가 오늘(KST)로 정한다. 맞추는 중인 퍼즐이 있으면 409 PUZZLE_ALREADY_ACTIVE
export const createPuzzle = (body: CreatePuzzleRequest): Promise<PuzzleDetail> =>
  requestApi({ method: 'POST', url: '/puzzles', data: body, schema: puzzleDetailSchema })

export const deletePuzzle = (id: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/puzzles/${encodeURIComponent(id)}` })
