import { unregisterPushToken } from '@/modules/notifications/util-push-registration'
import { tokenStore, type TokenPair } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { signOutSocialSdks } from '../util-social-login'
import { logoutSession } from './auth-api'

type SignOutDeviceOptions = {
  // 탈퇴: 서버가 이 계정의 세션·푸시 토큰을 이미 지웠으므로 SDK만 정리한다
  isAccountDeleted?: boolean
}

// 푸시 토큰 해제는 access token으로 인증하므로 서버 세션 폐기보다 먼저 보낸다. 모든 실패는 무시한다(오프라인 등)
const revokeRemoteSession = async (tokens: TokenPair): Promise<void> => {
  await unregisterPushToken(tokens.accessToken).catch(() => undefined)
  await logoutSession(tokens.refreshToken).catch(() => undefined)
}

const cleanUpAfterSignOut = async (tokens: TokenPair | null): Promise<void> => {
  await Promise.allSettled([tokens ? revokeRemoteSession(tokens) : undefined, signOutSocialSdks()])
}

// 로그아웃·탈퇴 공통: 기기 세션(토큰·캐시)을 먼저 끝내 인증 게이트가 바로 /login으로 보내고,
// 원격 정리(푸시 해제·서버 로그아웃·카카오/Google SDK)는 기다리지 않고 뒤에서 한다
export const signOutDevice = async ({ isAccountDeleted = false }: SignOutDeviceOptions = {}): Promise<void> => {
  const tokens = isAccountDeleted ? null : await tokenStore.read().catch(() => null)
  await session.endSession()
  cleanUpAfterSignOut(tokens).catch(() => undefined)
}
