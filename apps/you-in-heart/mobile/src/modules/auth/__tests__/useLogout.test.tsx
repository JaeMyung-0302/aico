import { act, renderHook, waitFor } from '@testing-library/react-native'
import { tokenStore } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { queryClient } from '@/shared/query-client'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { logoutSession } from '../data-access-auth/auth-api'
import { useLogout } from '../data-access-auth/useLogout'
import { signOutKakao } from '../util-social-login/kakao'

jest.mock('../data-access-auth/auth-api', () => ({ logoutSession: jest.fn(async () => undefined) }))
jest.mock('../util-social-login/kakao', () => ({ signOutKakao: jest.fn(async () => undefined) }))
jest.mock('@/shared/notifications/register-push-token', () => ({
  unregisterPushToken: jest.fn(async () => undefined),
  forgetPushToken: jest.fn(),
}))
jest.mock('@/modules/widget/data-access-widget/widget-storage', () => ({
  clearWidgetSnapshot: jest.fn(async () => undefined),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const TOKENS = { accessToken: 'access', refreshToken: 'refresh' }

// 끝나지 않는 원격 호출(느린 네트워크) 흉내
const never = () => new Promise<void>(() => undefined)

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn(TOKENS)
})

const runLogout = async () => {
  const { result } = await renderHook(() => useLogout(), { wrapper: QueryTestProvider })
  await act(async () => {
    await result.current.mutateAsync()
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
}

describe('useLogout', () => {
  it('SecureStore 토큰과 쿼리 캐시를 비우고, 지우기 전에 읽어 둔 refresh 로 서버 로그아웃·카카오 로그아웃을 한다', async () => {
    queryClient.setQueryData(['me'], { id: 'cached' })

    await runLogout()

    expect(session.getStatus()).toBe('signedOut')
    await expect(tokenStore.read()).resolves.toBeNull()
    expect(queryClient.getQueryData(['me'])).toBeUndefined()
    await waitFor(() => expect(logoutSession).toHaveBeenCalledWith('refresh'))
    expect(signOutKakao).toHaveBeenCalledTimes(1)
  })

  it('원격 정리가 끝나지 않아도(느린 네트워크) 바로 로그아웃된다', async () => {
    jest.mocked(logoutSession).mockImplementationOnce(never)
    jest.mocked(signOutKakao).mockImplementationOnce(never)

    await runLogout()

    expect(session.getStatus()).toBe('signedOut')
  })

  it('서버 로그아웃·SDK 로그아웃이 실패해도 기기에서는 로그아웃되고 처리되지 않은 거부가 없다', async () => {
    jest.mocked(logoutSession).mockRejectedValueOnce(new Error('offline'))
    jest.mocked(signOutKakao).mockRejectedValueOnce(new Error('sdk'))

    await runLogout()

    expect(session.getStatus()).toBe('signedOut')
  })
})
