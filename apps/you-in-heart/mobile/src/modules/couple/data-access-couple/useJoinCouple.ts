import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinCouple } from './couple-api'
import { syncCoupleCache } from './sync-couple-cache'

// 성공하면 /me 에 커플이 생겨 인증 게이트가 탭으로 보낸다
export const useJoinCouple = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => joinCouple(code),
    onSuccess: (couple) => syncCoupleCache(queryClient, couple),
  })
}
