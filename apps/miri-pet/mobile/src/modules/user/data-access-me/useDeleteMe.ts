import { useMutation } from '@tanstack/react-query'
import { signOutDevice } from '@/modules/auth/data-access-auth/sign-out-device'
import { deleteMe } from './me-api'

// 탈퇴 성공 → 토큰·캐시를 지우고(인증 게이트가 /login으로 보낸다) 카카오/Google SDK에서도 로그아웃한다
export const useDeleteMe = () =>
  useMutation({
    mutationFn: async () => {
      await deleteMe()
      await signOutDevice({ isAccountDeleted: true })
    },
  })
