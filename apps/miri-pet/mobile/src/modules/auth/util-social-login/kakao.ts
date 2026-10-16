import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login, logout } from '@react-native-kakao/user'
import { SocialLoginError } from './social-login-error'

const CANCEL_PATTERN = /cancel/i

let initialization: Promise<void> | null = null

const ensureKakaoSdk = (): Promise<void> => {
  initialization ??= initializeKakaoSDK(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '').catch((error: unknown) => {
    initialization = null
    throw error
  })
  return initialization
}

const isCancelError = (error: unknown): boolean => error instanceof Error && CANCEL_PATTERN.test(error.message)

// 카카오 로그인 → OIDC id_token. 사용자가 취소하면 null
export const getKakaoIdToken = async (): Promise<string | null> => {
  try {
    await ensureKakaoSdk()
    const token = await login()
    if (!token.idToken)
      throw new SocialLoginError('KAKAO', '카카오 로그인 설정을 확인하고 있어요. 잠시 후 다시 시도해 주세요')
    return token.idToken
  } catch (error) {
    if (error instanceof SocialLoginError) throw error
    if (isCancelError(error)) return null
    throw new SocialLoginError('KAKAO', '카카오 로그인에 실패했어요. 잠시 후 다시 시도해 주세요', { cause: error })
  }
}

// 초기화 전에 logout을 부르면 Android 네이티브가 UninitializedPropertyAccessException으로 앱을 종료한다
// (개발 로그인 세션·앱 재시작 직후처럼 이번 실행에서 카카오 로그인을 안 한 경우) → 반드시 먼저 초기화한다
export const signOutKakao = async (): Promise<void> => {
  await ensureKakaoSdk()
  await logout()
}
