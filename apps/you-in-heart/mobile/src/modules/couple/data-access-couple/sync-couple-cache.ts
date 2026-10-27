import type { Couple, MeResponse } from '@you-in-heart/shared'
import type { QueryClient } from '@tanstack/react-query'
import { COUPLE_QUERY_KEY, ME_QUERY_KEY } from '@/shared/auth/query-keys'

// 커플 응답을 /couples/me 캐시와 /me 요약에 함께 반영한다 → 인증 게이트·홈 배너가 바로 바뀐다
export const syncCoupleCache = (queryClient: QueryClient, couple: Couple): void => {
  queryClient.setQueryData(COUPLE_QUERY_KEY, couple)
  queryClient.setQueryData<MeResponse>(ME_QUERY_KEY, (previous) =>
    previous
      ? {
          ...previous,
          couple: { id: couple.id, status: couple.status, startedOn: couple.startedOn, purgeAfter: couple.purgeAfter },
        }
      : previous,
  )
  queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }).catch(() => undefined)
}
