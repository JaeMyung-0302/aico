import { act, renderHook, waitFor } from '@testing-library/react-native'
import { ApiError } from '@/shared/api/api-error'
import { tokenStore } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { loginWithKakao } from '../data-access-auth/auth-api'
import { useLogin } from '../data-access-auth/useLogin'
import { getKakaoIdToken } from '../util-social-login/kakao'
import { SocialLoginError } from '../util-social-login/social-login-error'

// 경계만 대체: 카카오 SDK, 네트워크(auth-api), 기기 보안 저장소
jest.mock('../util-social-login/kakao', () => ({ getKakaoIdToken: jest.fn() }))
jest.mock('../data-access-auth/auth-api', () => ({ loginWithKakao: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const TOKENS = { accessToken: 'access', refreshToken: 'refresh', accessTokenExpiresIn: 900, isNewUser: true }

const runLogin = async () => {
  const { result } = await renderHook(() => useLogin(), { wrapper: QueryTestProvider })
  await act(async () => {
    result.current.login()
  })
  await waitFor(() => expect(result.current.isPending).toBe(false))
  return result
}

beforeEach(async () => {
  jest.clearAllMocks()
  await session.endSession()
})

describe('useLogin', () => {
  it('카카오 id_token을 서버에 보내고, 받은 토큰으로 세션을 시작한다', async () => {
    jest.mocked(getKakaoIdToken).mockResolvedValue('kakao-id-token')
    jest.mocked(loginWithKakao).mockResolvedValue(TOKENS)

    const result = await runLogin()

    await waitFor(() => expect(session.getStatus()).toBe('signedIn'))
    expect(loginWithKakao).toHaveBeenCalledWith('kakao-id-token')
    expect(tokenStore.save).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' })
    expect(result.current.errorMessage).toBeNull()
  })

  it('사용자가 취소하면 서버를 부르지 않고 에러도 없다', async () => {
    jest.mocked(getKakaoIdToken).mockResolvedValue(null)

    const result = await runLogin()

    expect(loginWithKakao).not.toHaveBeenCalled()
    expect(result.current.errorMessage).toBeNull()
    expect(session.getStatus()).toBe('signedOut')
  })

  it('SDK 실패는 그 안내 문구를 보여준다', async () => {
    jest.mocked(getKakaoIdToken).mockRejectedValue(new SocialLoginError('KAKAO', '카카오 로그인에 실패했어요.'))
    const result = await runLogin()
    expect(result.current.errorMessage).toBe('카카오 로그인에 실패했어요.')
  })

  it.each([
    [new ApiError({ code: 'NETWORK', message: 'x' }), '인터넷 연결을 확인하고 다시 시도해 주세요.'],
    [
      new ApiError({ code: 'HTTP', status: 429, message: 'x' }),
      '로그인 시도가 너무 많아요. 1분 뒤에 다시 시도해 주세요.',
    ],
    [new ApiError({ code: 'HTTP', status: 401, message: 'x' }), '잠시 후 다시 시도해 주세요.'],
  ])('서버 실패(%s)는 안내 문구를 보여주고 세션을 시작하지 않는다', async (error, message) => {
    jest.mocked(getKakaoIdToken).mockResolvedValue('kakao-id-token')
    jest.mocked(loginWithKakao).mockRejectedValue(error)

    const result = await runLogin()

    expect(result.current.errorMessage).toBe(message)
    expect(session.getStatus()).toBe('signedOut')
  })
})
