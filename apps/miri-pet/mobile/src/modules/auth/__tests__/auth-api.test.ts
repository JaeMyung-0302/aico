import { authTokensSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { loginWithIdToken, logoutSession } from '../data-access-auth/auth-api'

// 네트워크 진입점만 대체한다
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

describe('auth-api', () => {
  it.each([
    ['KAKAO', '/auth/kakao'],
    ['GOOGLE', '/auth/google'],
  ] as const)('%s 로그인은 %s 로 id_token을 보내고 authTokensSchema로 검증한다', async (provider, url) => {
    await loginWithIdToken(provider, 'id-token')
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url,
      data: { idToken: 'id-token' },
      schema: authTokensSchema,
    })
  })

  it('로그아웃은 refresh token을 보내 서버 세션을 폐기한다', async () => {
    await logoutSession('refresh')
    expect(requestApi).toHaveBeenCalledWith({ method: 'POST', url: '/auth/logout', data: { refreshToken: 'refresh' } })
  })
})
