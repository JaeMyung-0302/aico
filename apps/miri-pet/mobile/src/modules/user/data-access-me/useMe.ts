import type { Me, UpdateMeRequest } from '@miri-pet/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ME_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { fetchMe, updateMe } from './me-api'

export { ME_QUERY_KEY }

export const useMe = () => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, enabled: isSignedIn })
}

// 알림 토글처럼 즉시 반영해야 하는 변경 — 낙관적 업데이트 후 실패하면 되돌린다
export const useUpdateMe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdateMeRequest) => updateMe(patch),
    onMutate: async (patch: UpdateMeRequest) => {
      await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY })
      const previous = queryClient.getQueryData<Me>(ME_QUERY_KEY)
      if (previous) queryClient.setQueryData<Me>(ME_QUERY_KEY, { ...previous, ...stripUndefined(patch) })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(ME_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  })
}

const stripUndefined = (patch: UpdateMeRequest) =>
  Object.fromEntries(Object.entries(patch).filter(([key, value]) => value !== undefined && key !== 'avatarMediaId'))
