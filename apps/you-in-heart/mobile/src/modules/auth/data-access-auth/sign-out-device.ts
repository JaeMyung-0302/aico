import { clearWidgetSnapshot } from '@/modules/widget/data-access-widget/widget-storage'
import { tokenStore, type TokenPair } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { forgetPushToken, unregisterPushToken } from '@/shared/notifications/register-push-token'
import { signOutKakao } from '../util-social-login/kakao'
import { logoutSession } from './auth-api'

type SignOutDeviceOptions = {
  // 탈퇴: 서버가 이 계정의 세션·푸시 토큰을 이미 지웠으므로 SDK만 정리한다
  isAccountDeleted?: boolean
}

// 푸시 토큰 해제(DELETE)는 서버 세션을 폐기하기 전에 보낸다(지우기 전에 읽어 둔 access token 으로). 실패해도 로그아웃은 보낸다
const revokeServerSession = async (tokens: TokenPair): Promise<void> => {
  await unregisterPushToken(tokens.accessToken).catch(() => undefined)
  await logoutSession(tokens.refreshToken)
}

const cleanUpAfterSignOut = async (tokens: TokenPair | null): Promise<void> => {
  await Promise.allSettled([tokens ? revokeServerSession(tokens) : undefined, signOutKakao()])
}

// 로그아웃·탈퇴 공통: 위젯 스냅샷을 비우고 기기 세션(SecureStore 토큰·쿼리 캐시)을 끝내 인증 게이트가 바로 /login으로 보낸다.
// 원격 정리(푸시 토큰·서버 로그아웃·카카오 SDK)는 기다리지 않고 뒤에서 한다
export const signOutDevice = async ({ isAccountDeleted = false }: SignOutDeviceOptions = {}): Promise<void> => {
  const tokens = isAccountDeleted ? null : await tokenStore.read().catch(() => null)
  if (isAccountDeleted) forgetPushToken()
  await clearWidgetSnapshot().catch(() => undefined)
  await session.endSession()
  cleanUpAfterSignOut(tokens).catch(() => undefined)
}
