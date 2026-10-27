import { initializeKakaoSDK } from '@react-native-kakao/core'
import { login as kakaoLogin } from '@react-native-kakao/user'
import { getKakaoIdToken } from '../kakao'
import { SocialLoginError } from '../social-login-error'

// 네이티브 SDK 경계만 대체한다
jest.mock('@react-native-kakao/core', () => ({ initializeKakaoSDK: jest.fn(async () => undefined) }))
jest.mock('@react-native-kakao/user', () => ({ login: jest.fn() }))

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

beforeEach(() => jest.clearAllMocks())

describe('getKakaoIdToken', () => {
  it('SDK를 초기화하고 카카오 id_token만 돌려준다', async () => {
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
