import type { CreatePuzzleRequest } from '@you-in-heart/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DIARY_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { createPuzzle, deletePuzzle, fetchPuzzle, fetchPuzzles } from './puzzle-api'

// 조각은 일기 사진에서 계산되므로 일기 키 아래에 둔다 — 일기 저장·사진 complete·삭제의 무효화가 퍼즐도 새로 받게 한다
export const PUZZLES_QUERY_KEY = [...DIARY_QUERY_KEY, 'puzzles'] as const
export const puzzleQueryKey = (id: string) => [...PUZZLES_QUERY_KEY, id] as const

export const usePuzzles = ({ isEnabled = true }: { isEnabled?: boolean } = {}) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: PUZZLES_QUERY_KEY, queryFn: fetchPuzzles, enabled: isSignedIn && isEnabled })
}

export const usePuzzle = (id: string) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: puzzleQueryKey(id), queryFn: () => fetchPuzzle(id), enabled: isSignedIn })
}

const usePuzzleMutation = <TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: PUZZLES_QUERY_KEY }) })
}

export const useCreatePuzzle = () => usePuzzleMutation((body: CreatePuzzleRequest) => createPuzzle(body))

export const useDeletePuzzle = () => usePuzzleMutation((id: string) => deletePuzzle(id))
