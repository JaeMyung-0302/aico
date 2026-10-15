import { act, renderHook, waitFor } from '@testing-library/react-native'
import { tokenStore } from '@/shared/api/token-store'
import { session } from '@/shared/auth/session'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { logoutSession } from '../data-access-auth/auth-api'
import { useLogout } from '../data-access-auth/useLogout'
import { signOutSocialSdks } from '../util-social-login'
import { unregisterPushToken } from '@/modules/notifications/util-push-registration'

jest.mock('../data-access-auth/auth-api', () => ({ logoutSession: jest.fn(async () => undefined) }))
jest.mock('../util-social-login', () => ({ signOutSocialSdks: jest.fn(async () => undefined) }))
jest.mock('@/modules/notifications/util-push-registration', () => ({ unregisterPushToken: jest.fn(async () => undefined) }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const TOKENS = { accessToken: 'access', refreshToken: 'refresh' }

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn(TOKENS)
})

describe('useLogout', () => {
  it('서버 세션을 폐기하고 SDK·기기 세션을 끝낸다', async () => {
    const { result } = await renderHook(() => useLogout(), { wrapper: QueryTestProvider })

    await act(async () => {
      await result.current.mutateAsync()
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(unregisterPushToken).toHaveBeenCalledTimes(1)
    expect(logoutSession).toHaveBeenCalledWith('refresh')
    expect(signOutSocialSdks).toHaveBeenCalledTimes(1)
    await expect(tokenStore.read()).resolves.toBeNull()
    expect(session.getStatus()).toBe('signedOut')
  })

  it('서버 로그아웃이 실패해도(오프라인) 기기에서는 로그아웃된다', async () => {
    jest.mocked(logoutSession).mockRejectedValueOnce(new Error('offline'))
    const { result } = await renderHook(() => useLogout(), { wrapper: QueryTestProvider })

    await act(async () => {
      await result.current.mutateAsync()
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(session.getStatus()).toBe('signedOut')
  })

  it('푸시 토큰 해제가 실패해도 로그아웃은 끝난다', async () => {
    jest.mocked(unregisterPushToken).mockRejectedValueOnce(new Error('offline'))
    const { result } = await renderHook(() => useLogout(), { wrapper: QueryTestProvider })

    await act(async () => {
      await result.current.mutateAsync()
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(logoutSession).toHaveBeenCalledWith('refresh')
    expect(session.getStatus()).toBe('signedOut')
  })
})
