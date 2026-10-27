import type { CreateDiaryRequest, UpdateDiaryRequest } from '@you-in-heart/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DIARY_QUERY_KEY } from '@/shared/auth/query-keys'
import { createDiary, updateDiary } from './diary-api'
import { diaryEntryQueryKey } from './useDiaryEntry'

export type SaveDiaryInput =
  | { mode: 'create'; body: CreateDiaryRequest }
  | { mode: 'edit'; id: string; body: UpdateDiaryRequest }

const save = (input: SaveDiaryInput) =>
  input.mode === 'create' ? createDiary(input.body) : updateDiary(input.id, input.body)

// 저장한 기록은 상세 캐시에 바로 넣고, 타임라인은 다시 받는다
export const useSaveDiary = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: save,
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEY })
      queryClient.setQueryData(diaryEntryQueryKey(entry.id), entry)
    },
  })
}
