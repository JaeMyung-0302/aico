import { useMutation } from '@tanstack/react-query'
import { session } from '@/shared/auth/session'
import { deleteMe } from './me-api'

// 탈퇴 성공 → 토큰·캐시를 지우고 인증 게이트가 /login으로 보낸다
export const useDeleteMe = () =>
  useMutation({
    mutationFn: async () => {
      await deleteMe()
      await session.endSession()
    },
  })
