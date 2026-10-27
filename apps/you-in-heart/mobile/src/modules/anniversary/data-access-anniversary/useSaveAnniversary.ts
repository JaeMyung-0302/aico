import type { CreateCustomAnniversaryRequest, UpdateCustomAnniversaryRequest } from '@you-in-heart/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAnniversary, deleteAnniversary, updateAnniversary } from './anniversary-api'
import { ANNIVERSARIES_QUERY_KEY } from './useAnniversaries'

type SaveAnniversaryInput =
  | { mode: 'create'; body: CreateCustomAnniversaryRequest }
  | { mode: 'edit'; id: string; body: UpdateCustomAnniversaryRequest }

const save = (input: SaveAnniversaryInput) =>
  input.mode === 'create' ? createAnniversary(input.body) : updateAnniversary(input.id, input.body)

// 저장·삭제가 끝나면 목록을 다시 받는다(자동 기념일과 섞인 날짜순은 서버가 정한다) → 홈·위젯도 따라 바뀐다
export const useSaveAnniversary = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: save,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANNIVERSARIES_QUERY_KEY }),
  })
}

export const useDeleteAnniversary = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAnniversary(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANNIVERSARIES_QUERY_KEY }),
  })
}
