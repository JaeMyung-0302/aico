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
jest.mock('@/modules/notifications/util-push-registration', () => ({
  unregisterPushToken: jest.fn(async () => undefined),
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
  it('기기 세션을 먼저 끝내고, 지우기 전에 읽어 둔 토큰으로 푸시 해제·서버 로그아웃·SDK 로그아웃을 한다', async () => {
    await runLogout()

    expect(session.getStatus()).toBe('signedOut')
    await expect(tokenStore.read()).resolves.toBeNull()
    await waitFor(() => expect(logoutSession).toHaveBeenCalledWith('refresh'))
    expect(unregisterPushToken).toHaveBeenCalledWith('access')
    expect(signOutSocialSdks).toHaveBeenCalledTimes(1)
  })

  it('원격 정리가 끝나지 않아도(느린 네트워크) 바로 로그아웃된다', async () => {
    jest.mocked(unregisterPushToken).mockImplementationOnce(never)
    jest.mocked(logoutSession).mockImplementationOnce(never)
    jest.mocked(signOutSocialSdks).mockImplementationOnce(never)

    await runLogout()

    expect(session.getStatus()).toBe('signedOut')
  })

  it('서버 로그아웃·푸시 해제·SDK 로그아웃이 실패해도 기기에서는 로그아웃되고 처리되지 않은 거부가 없다', async () => {
    jest.mocked(unregisterPushToken).mockRejectedValueOnce(new Error('offline'))
    jest.mocked(logoutSession).mockRejectedValueOnce(new Error('offline'))
    jest.mocked(signOutSocialSdks).mockRejectedValueOnce(new Error('sdk'))

    await runLogout()

    expect(session.getStatus()).toBe('signedOut')
    // 푸시 해제가 실패해도 서버 세션 폐기는 시도한다
    await waitFor(() => expect(logoutSession).toHaveBeenCalledWith('refresh'))
  })
})
