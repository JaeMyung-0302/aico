import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin'
import { SocialLoginError } from './social-login-error'

let isConfigured = false

const ensureConfigured = () => {
  if (isConfigured) return
  // 서버가 aud로 검증하는 값은 webClientId (id_token이 이 클라이언트로 발급된다)
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  })
  isConfigured = true
}

const isCancelError = (error: unknown): boolean =>
  isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED

// Google 로그인 → id_token. 사용자가 취소하면 null
export const getGoogleIdToken = async (): Promise<string | null> => {
  try {
    ensureConfigured()
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (response.type === 'cancelled') return null
    if (!response.data.idToken)
      throw new SocialLoginError('GOOGLE', 'Google 로그인 설정을 확인하고 있어요. 잠시 후 다시 시도해 주세요')
    return response.data.idToken
  } catch (error) {
    if (error instanceof SocialLoginError) throw error
    if (isCancelError(error)) return null
    throw new SocialLoginError('GOOGLE', 'Google 로그인에 실패했어요. 잠시 후 다시 시도해 주세요', { cause: error })
  }
}

export const signOutGoogle = async (): Promise<void> => {
  if (!isConfigured) return
  await GoogleSignin.signOut()
}
