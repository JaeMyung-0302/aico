import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login as kakaoLogin } from '@react-native-kakao/user'
import { getGoogleIdToken } from '../google'
import { getKakaoIdToken } from '../kakao'
import { SocialLoginError } from '../social-login-error'

// 네이티브 SDK 경계만 대체한다
jest.mock('@react-native-kakao/core', () => ({ initializeKakaoSDK: jest.fn(async () => undefined) }))
jest.mock('@react-native-kakao/user', () => ({ login: jest.fn() }))
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(async () => true), signIn: jest.fn() },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: (error: unknown) => typeof error === 'object' && error !== null && 'code' in error,
}))

const KAKAO_TOKEN = {
  accessToken: 'kakao-access',
  refreshToken: 'kakao-refresh',
  accessTokenExpiresAt: 0,
  refreshTokenExpiresAt: 0,
  accessTokenExpiresIn: 0,
  refreshTokenExpiresIn: 0,
  scopes: [],
}

const mockedKakaoLogin = jest.mocked(kakaoLogin)
const mockedGoogleSignIn = jest.mocked(GoogleSignin.signIn)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getKakaoIdToken', () => {
  it('SDK를 초기화하고 카카오 id_token을 돌려준다', async () => {
    mockedKakaoLogin.mockResolvedValue({ ...KAKAO_TOKEN, idToken: 'kakao-id-token' })

    await expect(getKakaoIdToken()).resolves.toBe('kakao-id-token')
    expect(initializeKakaoSDK).toHaveBeenCalled()
  })

  it('사용자가 취소하면 null (에러 안내 없음)', async () => {
    mockedKakaoLogin.mockRejectedValue(new Error('ClientFailed(reason: Cancelled, errorMessage: user cancelled)'))
    await expect(getKakaoIdToken()).resolves.toBeNull()
  })

  it('id_token이 없으면(OpenID Connect 비활성) SocialLoginError', async () => {
    mockedKakaoLogin.mockResolvedValue(KAKAO_TOKEN)
    await expect(getKakaoIdToken()).rejects.toBeInstanceOf(SocialLoginError)
  })

  it('그 밖의 SDK 실패는 SocialLoginError로 감싼다', async () => {
    mockedKakaoLogin.mockRejectedValue(new Error('KOE101'))
    await expect(getKakaoIdToken()).rejects.toMatchObject({ name: 'SocialLoginError', provider: 'KAKAO' })
  })
})

describe('getGoogleIdToken', () => {
  it('Google id_token을 돌려준다', async () => {
    mockedGoogleSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'google-id-token',
        serverAuthCode: null,
        scopes: [],
        user: { id: '1', name: null, email: 'a@b.c', photo: null, familyName: null, givenName: null },
      },
    })

    await expect(getGoogleIdToken()).resolves.toBe('google-id-token')
    expect(GoogleSignin.configure).toHaveBeenCalled()
  })

  it('취소 응답이면 null', async () => {
    mockedGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null })
    await expect(getGoogleIdToken()).resolves.toBeNull()
  })

  it('취소 에러 코드(SIGN_IN_CANCELLED)도 null', async () => {
    mockedGoogleSignIn.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' }))
    await expect(getGoogleIdToken()).resolves.toBeNull()
  })

  it('id_token이 비어 있으면 SocialLoginError', async () => {
    mockedGoogleSignIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: null,
        serverAuthCode: null,
        scopes: [],
        user: { id: '1', name: null, email: 'a@b.c', photo: null, familyName: null, givenName: null },
      },
    })
    await expect(getGoogleIdToken()).rejects.toMatchObject({ name: 'SocialLoginError', provider: 'GOOGLE' })
  })
})
