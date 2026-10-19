import { act, renderHook, waitFor } from '@testing-library/react-native'
import { logoutSession } from '@/modules/auth/data-access-auth/auth-api'
import { signOutSocialSdks } from '@/modules/auth/util-social-login'
import { unregisterPushToken } from '@/modules/notifications/util-push-registration'
import { session } from '@/shared/auth/session'
import { queryClient } from '@/shared/query-client'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { deleteMe } from '../data-access-me/me-api'
import { useDeleteMe } from '../data-access-me/useDeleteMe'

jest.mock('../data-access-me/me-api', () => ({ deleteMe: jest.fn(async () => undefined) }))
jest.mock('@/modules/auth/data-access-auth/auth-api', () => ({ logoutSession: jest.fn(async () => undefined) }))
jest.mock('@/modules/auth/util-social-login', () => ({ signOutSocialSdks: jest.fn(async () => undefined) }))
jest.mock('@/modules/notifications/util-push-registration', () => ({
  unregisterPushToken: jest.fn(async () => undefined),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const TOKENS = { accessToken: 'access', refreshToken: 'refresh' }
const CACHED_KEY = ['feed']

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn(TOKENS)
  queryClient.setQueryData(CACHED_KEY, { items: ['이전 계정 데이터'] })
})

const runDelete = async () => {
  const { result } = await renderHook(() => useDeleteMe(), { wrapper: QueryTestProvider })
  await act(async () => {
    await result.current.mutateAsync().catch(() => undefined)
  })
  return result
}

describe('useDeleteMe', () => {
  it('탈퇴가 성공하면 기기 세션·캐시를 비우고 카카오/Google SDK에서도 로그아웃한다', async () => {
    const result = await runDelete()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(deleteMe).toHaveBeenCalledTimes(1)
    expect(session.getStatus()).toBe('signedOut')
    expect(queryClient.getQueryData(CACHED_KEY)).toBeUndefined()
    await waitFor(() => expect(signOutSocialSdks).toHaveBeenCalledTimes(1))
    // 서버 탈퇴가 이 계정의 세션·푸시 토큰을 이미 모두 지웠다 (이미 무효인 토큰으로 다시 부르지 않는다)
    expect(unregisterPushToken).not.toHaveBeenCalled()
    expect(logoutSession).not.toHaveBeenCalled()
  })

  it('탈퇴에 실패하면 로그인 상태를 유지하고 아무것도 정리하지 않는다', async () => {
    jest.mocked(deleteMe).mockRejectedValueOnce(new Error('offline'))
    const result = await runDelete()
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(session.getStatus()).toBe('signedIn')
    expect(signOutSocialSdks).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(CACHED_KEY)).toEqual({ items: ['이전 계정 데이터'] })
  })

  it('SDK 로그아웃이 실패해도 탈퇴는 성공으로 끝난다', async () => {
    jest.mocked(signOutSocialSdks).mockRejectedValueOnce(new Error('sdk'))
    const result = await runDelete()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(session.getStatus()).toBe('signedOut')
  })
})
