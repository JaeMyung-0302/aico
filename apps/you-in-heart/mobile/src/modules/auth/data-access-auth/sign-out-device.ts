import { tokenStore, type TokenPair } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { signOutKakao } from '../util-social-login/kakao'
import { logoutSession } from './auth-api'

type SignOutDeviceOptions = {
  // 탈퇴: 서버가 이 계정의 세션을 이미 지웠으므로 SDK만 정리한다
  isAccountDeleted?: boolean
}

// TODO(1B): 푸시 토큰 해제(DELETE /me/push-tokens/:token)를 서버 로그아웃 앞에 붙인다
const cleanUpAfterSignOut = async (tokens: TokenPair | null): Promise<void> => {
  await Promise.allSettled([tokens ? logoutSession(tokens.refreshToken) : undefined, signOutKakao()])
}

// 로그아웃·탈퇴 공통: 기기 세션(SecureStore 토큰·쿼리 캐시)을 먼저 끝내 인증 게이트가 바로 /login으로 보내고,
// 원격 정리(서버 로그아웃·카카오 SDK)는 기다리지 않고 뒤에서 한다
export const signOutDevice = async ({ isAccountDeleted = false }: SignOutDeviceOptions = {}): Promise<void> => {
  const tokens = isAccountDeleted ? null : await tokenStore.read().catch(() => null)
  await session.endSession()
  cleanUpAfterSignOut(tokens).catch(() => undefined)
}
