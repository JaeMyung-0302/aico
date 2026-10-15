import { act, renderHook, waitFor } from '@testing-library/react-native'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { sharedMemoryTokenStore as memoryTokenStore } from '@/test-utils/memory-token-store'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { usePushNavigation, usePushRouting } from '../feature-push-navigation/usePushNavigation'

// 경계만 대체: 기기 알림 모듈, 라우터, /me·/pets 네트워크, 기기 토큰 저장소
type ResponseListener = (response: Notifications.NotificationResponse) => void
let mockResponseListener: ResponseListener | null = null
const mockRemove = jest.fn()
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((listener: ResponseListener) => {
    mockResponseListener = listener
    return { remove: mockRemove }
  }),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
}))
let mockSegment = '(tabs)'
let mockPathname = '/'
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useSegments: () => [mockSegment],
  usePathname: () => mockPathname,
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').sharedMemoryTokenStore,
}))

const CONVERSATION_ID = '01890a5d-ac96-774b-bcce-b302099a8001'
const POST_ID = '01890a5d-ac96-774b-bcce-b302099a8002'
const DM_HREF = { pathname: '/dm/[conversationId]', params: { conversationId: CONVERSATION_ID } }
const POST_HREF = { pathname: '/posts/[postId]', params: { postId: POST_ID } }

const notificationOf = (identifier: string, data: Record<string, unknown>): Notifications.Notification => ({
  date: 0,
  request: {
    identifier,
    content: {
      title: '미리펫',
      subtitle: null,
      body: null,
      data,
      sound: null,
      categoryIdentifier: null,
    },
    trigger: null,
  },
})

const responseOf = (identifier: string, data: Record<string, unknown>): Notifications.NotificationResponse => ({
  actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  notification: notificationOf(identifier, data),
})

const DM_RESPONSE = responseOf('n-dm', { kind: 'DM', conversationId: CONVERSATION_ID })
const LIKE_RESPONSE = responseOf('n-like', { kind: 'LIKE', postId: POST_ID })

const tapNotification = (response: Notifications.NotificationResponse) =>
  act(() => {
    mockResponseListener?.(response)
  })

// 남은 비동기 작업(콜드 스타트 응답 조회)을 비운다
const flushAsync = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

const readForegroundHandler = () => {
  const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls.at(-1)?.[0]
  if (!handler) throw new Error('setNotificationHandler가 호출되지 않았어요')
  return handler
}

beforeEach(() => {
  jest.clearAllMocks()
  mockResponseListener = null
  mockSegment = '(tabs)'
  mockPathname = '/'
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(null)
})

describe('usePushRouting', () => {
  const renderRouting = (isReady: boolean) =>
    renderHook(
      ({ isReady: ready }: { isReady: boolean }) => usePushRouting({ isReady: ready, pathname: mockPathname }),
      {
        initialProps: { isReady },
      },
    )

  it('웜 스타트: 게이트가 열려 있으면 탭한 알림 화면으로 바로 이동한다', async () => {
    await renderRouting(true)
    await flushAsync()
    await tapNotification(DM_RESPONSE)
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith(DM_HREF)
  })

  it('웜 스타트: 게이트가 닫혀 있으면 기다렸다가 열리는 순간 마지막으로 탭한 화면으로 이동한다', async () => {
    const { rerender } = await renderRouting(false)
    await flushAsync()
    await tapNotification(DM_RESPONSE)
    await tapNotification(LIKE_RESPONSE)
    expect(router.push).not.toHaveBeenCalled()

    await rerender({ isReady: true })
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith(POST_HREF)

    // 한 번 보낸 화면은 다시 보내지 않는다
    await rerender({ isReady: false })
    await rerender({ isReady: true })
    expect(router.push).toHaveBeenCalledTimes(1)
  })

  it('콜드 스타트: 앱을 연 알림을 읽어 이동하고 마지막 응답을 지운다', async () => {
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(DM_RESPONSE)
    await renderRouting(true)
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(DM_HREF))
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled()
  })

  it('콜드 스타트: 게이트(로그인·동의·펫)가 열릴 때까지 대기열에 둔다', async () => {
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(DM_RESPONSE)
    const { rerender } = await renderRouting(false)
    await flushAsync()
    expect(router.push).not.toHaveBeenCalled()
    await rerender({ isReady: true })
    expect(router.push).toHaveBeenCalledWith(DM_HREF)
  })

  it('콜드 스타트 응답이 리스너로도 오면(같은 identifier) 한 번만 이동한다', async () => {
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(DM_RESPONSE)
    await renderRouting(true)
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1))
    await tapNotification(DM_RESPONSE)
    expect(router.push).toHaveBeenCalledTimes(1)
  })

  it('이동할 수 없는 data(알 수 없는 kind)는 무시한다', async () => {
    await renderRouting(true)
    await flushAsync()
    await tapNotification(responseOf('n-x', { kind: 'PLACE_REPORT_REVIEWED' }))
    expect(router.push).not.toHaveBeenCalled()
  })

  it('콜드 스타트 응답 조회가 실패해도 앱은 계속 동작한다', async () => {
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockRejectedValue(new Error('native'))
    await renderRouting(true)
    await flushAsync()
    await tapNotification(LIKE_RESPONSE)
    expect(router.push).toHaveBeenCalledWith(POST_HREF)
  })

  it('언마운트하면 리스너와 포그라운드 핸들러를 해제한다', async () => {
    const { unmount } = await renderRouting(true)
    await flushAsync()
    await act(() => unmount())
    expect(mockRemove).toHaveBeenCalled()
    expect(Notifications.setNotificationHandler).toHaveBeenLastCalledWith(null)
  })

  describe('포그라운드 알림 핸들러', () => {
    it('지금 보고 있는 대화방의 DM은 배너를 띄우지 않는다', async () => {
      mockPathname = `/dm/${CONVERSATION_ID}`
      await renderRouting(true)
      await flushAsync()
      await expect(readForegroundHandler().handleNotification(DM_RESPONSE.notification)).resolves.toEqual({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      })
    })

    it('다른 화면이면 DM·소셜 알림 모두 배너를 띄운다', async () => {
      mockPathname = '/dm'
      await renderRouting(true)
      await flushAsync()
      const handler = readForegroundHandler()
      await expect(handler.handleNotification(DM_RESPONSE.notification)).resolves.toMatchObject({
        shouldShowBanner: true,
        shouldShowList: true,
      })
      await expect(handler.handleNotification(LIKE_RESPONSE.notification)).resolves.toMatchObject({
        shouldShowBanner: true,
      })
    })

    it('화면이 바뀌면 최신 경로로 판단한다', async () => {
      const { rerender } = await renderHook(
        ({ pathname }: { pathname: string }) => usePushRouting({ isReady: true, pathname }),
        { initialProps: { pathname: '/' } },
      )
      await flushAsync()
      await rerender({ pathname: `/dm/${CONVERSATION_ID}` })
      await expect(readForegroundHandler().handleNotification(DM_RESPONSE.notification)).resolves.toMatchObject({
        shouldShowBanner: false,
      })
    })
  })
})

describe('usePushNavigation (인증 게이트 연결)', () => {
  const ME = {
    id: '01890a5d-ac96-774b-bcce-b302099a8057',
    nickname: 'bori',
    avatarUrl: null,
    bio: null,
    role: 'USER' as const,
    notifyVaccination: true,
    notifySocial: true,
    notifyDm: true,
    hasRequiredConsents: true,
  }
  const PET = {
    id: '01890a5d-ac96-774b-bcce-b302099a8058',
    name: '보리',
    species: 'DOG' as const,
    breed: null,
    birthDate: null,
    size: 'S' as const,
    avatarUrl: null,
  }

  const renderNavigation = async (isNavigatorMounted = true) => {
    await act(() => session.bootstrap())
    return renderHook(() => usePushNavigation({ isNavigatorMounted }), { wrapper: QueryTestProvider })
  }

  beforeEach(() => {
    jest.mocked(fetchMe).mockResolvedValue(ME)
    jest.mocked(fetchMyPets).mockResolvedValue([PET])
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(DM_RESPONSE)
  })

  it('로그인 + 동의 + 펫이 확인되면 콜드 스타트 알림 화면으로 이동한다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    await renderNavigation()
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(DM_HREF))
  })

  it('로그아웃 상태면 이동하지 않는다', async () => {
    memoryTokenStore.reset(null)
    await renderNavigation()
    await flushAsync()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('펫이 0마리(03 펫 만들기로 가야 함)면 이동하지 않는다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    jest.mocked(fetchMyPets).mockResolvedValue([])
    await renderNavigation()
    await waitFor(() => expect(fetchMyPets).toHaveBeenCalled())
    await flushAsync()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('네비게이터가 마운트되기 전에는 이동하지 않는다', async () => {
    memoryTokenStore.reset({ accessToken: 'a', refreshToken: 'r' })
    await renderNavigation(false)
    await waitFor(() => expect(fetchMyPets).toHaveBeenCalled())
    await flushAsync()
    expect(router.push).not.toHaveBeenCalled()
  })
})
