import type { AuthProvider } from '@miri-pet/shared'
import { getGoogleIdToken, signOutGoogle } from './google'
import { getKakaoIdToken, signOutKakao } from './kakao'

export { SocialLoginError } from './social-login-error'

// v1: 카카오 + Google (Apple 제외 — 사용자 결정)
export const getSocialIdToken: Record<AuthProvider, () => Promise<string | null>> = {
  KAKAO: getKakaoIdToken,
  GOOGLE: getGoogleIdToken,
}

// 다음 로그인에서 다른 계정을 고를 수 있도록 SDK 세션도 정리한다 (실패는 무시)
export const signOutSocialSdks = async (): Promise<void> => {
  await Promise.allSettled([signOutKakao(), signOutGoogle()])
}
