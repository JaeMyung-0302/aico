import { act, renderHook, waitFor } from '@testing-library/react-native'
import { ApiError } from '@/shared/api/api-error'
import { tokenStore } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { QueryTestProvider as QueryProvider } from '@/test-utils/QueryTestProvider'
import { loginWithIdToken } from '../data-access-auth/auth-api'
import { useLogin } from '../data-access-auth/useLogin'
import { getSocialIdToken, SocialLoginError } from '../util-social-login'

// 경계만 대체: 소셜 SDK, 네트워크(auth-api), 기기 보안 저장소
jest.mock('../util-social-login/kakao', () => ({ getKakaoIdToken: jest.fn() }))
jest.mock('../util-social-login/google', () => ({ getGoogleIdToken: jest.fn() }))
jest.mock('../data-access-auth/auth-api', () => ({ loginWithIdToken: jest.fn() }))
jest.mock('@/shared/api/token-store', () => {
  let current: { accessToken: string; refreshToken: string } | null = null
  return {
    tokenStore: {
      read: jest.fn(async () => current),
      save: jest.fn(async (tokens: { accessToken: string; refreshToken: string }) => {
        current = tokens
      }),
      clear: jest.fn(async () => {
        current = null
      }),
    },
  }
})

const TOKENS = { accessToken: 'access', refreshToken: 'refresh', accessTokenExpiresIn: 900, isNewUser: true }

const mockedLoginWithIdToken = jest.mocked(loginWithIdToken)
const mockedKakao = jest.mocked(getSocialIdToken.KAKAO)
const mockedGoogle = jest.mocked(getSocialIdToken.GOOGLE)

beforeEach(async () => {
  jest.clearAllMocks()
  await session.endSession()
})

describe('useLogin', () => {
  it('카카오 id_token을 서버에 보내고, 받은 토큰으로 세션을 시작한다', async () => {
    mockedKakao.mockResolvedValue('kakao-id-token')
    mockedLoginWithIdToken.mockResolvedValue(TOKENS)
    const { result } = await renderHook(() => useLogin(), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('KAKAO')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    await waitFor(() => expect(session.getStatus()).toBe('signedIn'))
    expect(mockedLoginWithIdToken).toHaveBeenCalledWith('KAKAO', 'kakao-id-token')
    expect(tokenStore.save).toHaveBeenCalledWith({ accessToken: 'access', refreshToken: 'refresh' })
    expect(result.current.errorMessage).toBeNull()
  })

  it('Google id_token은 GOOGLE 제공자로 보낸다', async () => {
    mockedGoogle.mockResolvedValue('google-id-token')
    mockedLoginWithIdToken.mockResolvedValue(TOKENS)
    const { result } = await renderHook(() => useLogin(), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('GOOGLE')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    await waitFor(() => expect(mockedLoginWithIdToken).toHaveBeenCalledWith('GOOGLE', 'google-id-token'))
  })

  it('사용자가 취소하면 서버를 부르지 않고 에러도 없다', async () => {
    mockedKakao.mockResolvedValue(null)
    const { result } = await renderHook(() => useLogin(), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('KAKAO')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    await waitFor(() => expect(result.current.pendingProvider).toBeNull())
    expect(mockedLoginWithIdToken).not.toHaveBeenCalled()
    expect(result.current.errorMessage).toBeNull()
    expect(session.getStatus()).toBe('signedOut')
  })

  it('SDK 실패는 그 안내 문구를 보여준다', async () => {
    mockedKakao.mockRejectedValue(
      new SocialLoginError('KAKAO', '카카오 로그인에 실패했어요. 잠시 후 다시 시도해 주세요'),
    )
    const { result } = await renderHook(() => useLogin(), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('KAKAO')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('카카오 로그인에 실패했어요. 잠시 후 다시 시도해 주세요'),
    )
  })

  it('서버 실패는 공통 안내 문구를 보여주고 세션을 시작하지 않는다', async () => {
    mockedGoogle.mockResolvedValue('google-id-token')
    mockedLoginWithIdToken.mockRejectedValue(new ApiError({ code: 'HTTP', status: 401, message: 'invalid token' }))
    const { result } = await renderHook(() => useLogin(), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('GOOGLE')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    await waitFor(() => expect(result.current.errorMessage).toBe('로그인하지 못했어요. 잠시 후 다시 시도해 주세요'))
    expect(session.getStatus()).toBe('signedOut')
  })

  it('로그인 요청이 레이트 리밋(429)에 걸리면 잠시 후 다시 시도하라는 안내를 onError로 알린다', async () => {
    mockedGoogle.mockResolvedValue('google-id-token')
    mockedLoginWithIdToken.mockRejectedValue(new ApiError({ code: 'HTTP', status: 429, message: 'Too Many Requests' }))
    const onError = jest.fn()
    const { result } = await renderHook(() => useLogin({ onError }), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('GOOGLE')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    const message = '로그인 시도가 너무 많아요. 1분 뒤에 다시 시도해 주세요'
    expect(result.current.errorMessage).toBe(message)
    expect(onError).toHaveBeenCalledWith(message)
  })

  it('취소는 onError를 부르지 않는다', async () => {
    mockedKakao.mockResolvedValue(null)
    const onError = jest.fn()
    const { result } = await renderHook(() => useLogin({ onError }), { wrapper: QueryProvider })

    await act(async () => {
      result.current.login('KAKAO')
    })
    await waitFor(() => expect(result.current.pendingProvider).toBeNull())

    expect(onError).not.toHaveBeenCalled()
  })
})
