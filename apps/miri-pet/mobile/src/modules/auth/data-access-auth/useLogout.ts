import { useMutation } from '@tanstack/react-query'
import { unregisterPushToken } from '@/modules/notifications/util-push-registration'
import { tokenStore } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { signOutSocialSdks } from '../util-social-login'
import { logoutSession } from './auth-api'

// 푸시 토큰 해제·서버 세션 폐기는 실패해도(오프라인 등) 기기에서는 반드시 로그아웃한다
// 푸시 토큰은 access token이 살아 있을 때(세션 폐기 전) 해제해야 한다
export const useLogout = () =>
  useMutation({
    mutationFn: async () => {
      await unregisterPushToken().catch(() => undefined)
      const tokens = await tokenStore.read().catch(() => null)
      if (tokens) await logoutSession(tokens.refreshToken).catch(() => undefined)
      await signOutSocialSdks()
      await session.endSession()
    },
  })
