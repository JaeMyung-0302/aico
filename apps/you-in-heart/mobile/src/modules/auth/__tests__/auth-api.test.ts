import { authTokensSchema } from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'
import { loginWithKakao, logoutSession } from '../data-access-auth/auth-api'
import { devLogin } from '../feature-dev-login/dev-login-api'

// 네트워크 진입점만 대체한다
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

beforeEach(() => jest.clearAllMocks())

describe('auth-api', () => {
  it('카카오 로그인은 /auth/kakao 로 id_token과 기기 이름을 보내고 authTokensSchema로 검증한다', async () => {
    await loginWithKakao('id-token')
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/auth/kakao',
      data: { idToken: 'id-token', deviceLabel: expect.any(String) },
      schema: authTokensSchema,
    })
  })

  it('로그아웃은 refresh token을 보내 서버 세션을 폐기한다', async () => {
    await logoutSession('refresh')
    expect(requestApi).toHaveBeenCalledWith({ method: 'POST', url: '/auth/logout', data: { refreshToken: 'refresh' } })
  })

  it('개발 로그인은 /auth/dev-login 으로 devKey를 보낸다', async () => {
    await devLogin({ devKey: 'dev-a' })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/auth/dev-login',
      data: { devKey: 'dev-a' },
      schema: authTokensSchema,
    })
  })
})
