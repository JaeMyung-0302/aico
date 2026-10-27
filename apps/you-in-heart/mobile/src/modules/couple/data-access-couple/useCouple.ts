import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { COUPLE_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { fetchCouple, reconnectCouple, unlinkCouple } from './couple-api'
import { syncCoupleCache } from './sync-couple-cache'

// GET /couples/me — 연결된 뒤에만 부른다(미연결이면 서버가 403)
export const useCouple = ({ isEnabled = true }: { isEnabled?: boolean } = {}) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: COUPLE_QUERY_KEY, queryFn: fetchCouple, enabled: isSignedIn && isEnabled })
}

export const useUnlinkCouple = () => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: () => unlinkCouple(), onSuccess: (couple) => syncCoupleCache(queryClient, couple) })
}

// 두 사람이 모두 확인해야 ACTIVE 로 돌아간다 (한 명만이면 UNLINKING 유지 + 내 확인 시각 기록)
export const useReconnectCouple = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reconnectCouple(),
    onSuccess: (couple) => syncCoupleCache(queryClient, couple),
  })
}
