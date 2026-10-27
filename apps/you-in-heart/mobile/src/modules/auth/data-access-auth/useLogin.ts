import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { getKakaoIdToken } from '../util-social-login/kakao'
import { SocialLoginError } from '../util-social-login/social-login-error'
import { loginWithKakao } from './auth-api'

type LoginResult = { status: 'cancelled' } | { status: 'signedIn'; isNewUser: boolean }

const loginWithKakaoAccount = async (): Promise<LoginResult> => {
  const idToken = await getKakaoIdToken()
  if (!idToken) return { status: 'cancelled' }
  const tokens = await loginWithKakao(idToken)
  await session.signIn({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
  return { status: 'signedIn', isNewUser: tokens.isNewUser }
}

// SCR-01 로그인 실패 안내 (제목 "로그인하지 못했어요" 아래 설명)
export const toLoginErrorMessage = (error: unknown): string => {
  if (error instanceof SocialLoginError) return error.message
  // 서버 /auth/*는 IP당 분당 10회로 제한된다
  if (error instanceof ApiError && error.kind === 'RATE_LIMITED')
    return '로그인 시도가 너무 많아요. 1분 뒤에 다시 시도해 주세요.'
  if (error instanceof ApiError && error.code === 'NETWORK') return '인터넷 연결을 확인하고 다시 시도해 주세요.'
  return '잠시 후 다시 시도해 주세요.'
}

// 카카오 SDK → 서버 로그인 → 세션 시작. 이후 화면 이동은 인증 게이트가 맡는다
export const useLogin = () => {
  const mutation = useMutation({ mutationFn: loginWithKakaoAccount })
  return {
    login: () => mutation.mutate(),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? toLoginErrorMessage(mutation.error) : null,
  }
}
