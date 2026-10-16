import type { AuthProvider } from '@miri-pet/shared'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { getSocialIdToken, SocialLoginError } from '../util-social-login'
import { loginWithIdToken } from './auth-api'

type LoginResult = { status: 'cancelled' } | { status: 'signedIn'; isNewUser: boolean }

const loginWith = async (provider: AuthProvider): Promise<LoginResult> => {
  const idToken = await getSocialIdToken[provider]()
  if (!idToken) return { status: 'cancelled' }
  const tokens = await loginWithIdToken(provider, idToken)
  await session.signIn({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
  return { status: 'signedIn', isNewUser: tokens.isNewUser }
}

const toLoginErrorMessage = (error: unknown): string => {
  if (error instanceof SocialLoginError) return error.message
  // 서버 /auth/*는 IP당 분당 10회로 제한된다
  if (error instanceof ApiError && error.status === 429) return '로그인 시도가 너무 많아요. 1분 뒤에 다시 시도해 주세요'
  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요'
}

// 소셜 SDK → 서버 로그인 → 세션 시작. 이후 화면 이동은 인증 게이트가 맡는다
export const useLogin = ({ onError }: { onError?: (message: string) => void } = {}) => {
  const mutation = useMutation({ mutationFn: loginWith, onError: (error) => onError?.(toLoginErrorMessage(error)) })
  return {
    login: (provider: AuthProvider) => mutation.mutate(provider),
    pendingProvider: mutation.isPending ? (mutation.variables ?? null) : null,
    errorMessage: mutation.error ? toLoginErrorMessage(mutation.error) : null,
  }
}
