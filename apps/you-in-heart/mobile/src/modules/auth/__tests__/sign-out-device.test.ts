import { waitFor } from '@testing-library/react-native'
import { pendingShare } from '@/modules/quote/util-share/pending-share'
import { clearWidgetSnapshot } from '@/modules/widget/data-access-widget/widget-storage'
import { session } from '@/shared/auth/session'
import { forgetPushToken, unregisterPushToken } from '@/shared/notifications/register-push-token'
import { logoutSession } from '../data-access-auth/auth-api'
import { signOutDevice } from '../data-access-auth/sign-out-device'
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

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn(TOKENS)
})

describe('signOutDevice', () => {
  it('로그아웃: 위젯 스냅샷을 비우고, 푸시 토큰 해제(DELETE)를 서버 로그아웃보다 먼저 보낸다', async () => {
    const order: string[] = []
    jest.mocked(unregisterPushToken).mockImplementationOnce(async () => {
      order.push('push')
    })
    jest.mocked(logoutSession).mockImplementationOnce(async () => {
      order.push('logout')
    })

    await signOutDevice()

    expect(clearWidgetSnapshot).toHaveBeenCalledTimes(1)
    expect(session.getStatus()).toBe('signedOut')
    await waitFor(() => expect(order).toEqual(['push', 'logout']))
    expect(unregisterPushToken).toHaveBeenCalledWith('access')
  })

  it('푸시 토큰 해제가 실패해도 서버 로그아웃은 보낸다', async () => {
    jest.mocked(unregisterPushToken).mockRejectedValueOnce(new Error('offline'))
    await signOutDevice()
    await waitFor(() => expect(logoutSession).toHaveBeenCalledWith('refresh'))
  })

  it('탈퇴: 서버가 토큰을 이미 지웠으므로 DELETE 없이 기억만 지우고 위젯을 비운다', async () => {
    await signOutDevice({ isAccountDeleted: true })
    expect(forgetPushToken).toHaveBeenCalledTimes(1)
    expect(clearWidgetSnapshot).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(signOutKakao).toHaveBeenCalledTimes(1))
    expect(unregisterPushToken).not.toHaveBeenCalled()
    expect(logoutSession).not.toHaveBeenCalled()
  })

  it('로그인 전에 기억해 둔 공유를 지워 다음 계정이 이어받지 않는다', async () => {
    pendingShare.getState().set({ kind: 'text', text: '보고 싶어' })
    await signOutDevice()
    expect(pendingShare.getState().payload).toBeNull()
  })

  it('위젯 비우기가 실패해도 로그아웃된다', async () => {
    jest.mocked(clearWidgetSnapshot).mockRejectedValueOnce(new Error('native'))
    await signOutDevice()
    expect(session.getStatus()).toBe('signedOut')
  })
})
