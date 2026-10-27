import { router, Slot } from 'expo-router'
import { act, renderRouter, screen } from 'expo-router/testing-library'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import RootLayout from '@/app/_layout'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { queryClient } from '@/shared/query-client'
import { useWidgetSync } from '@/modules/widget/feature-widget-sync/useWidgetSync'
import { usePushTokenRegistration } from '@/shared/notifications/register-push-token'
import { ME } from '@/test-utils/fixtures'
import { sharedMemoryTokenStore as memoryTokenStore } from '@/test-utils/memory-token-store'

// 경계만 대체: 폰트·스플래시·공유 인텐트(네이티브), /me 네트워크, 기기 저장소, Sentry
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }))
jest.mock('pretendard/dist/public/static/Pretendard-Regular.otf', () => 1)
jest.mock('pretendard/dist/public/static/Pretendard-Medium.otf', () => 1)
jest.mock('pretendard/dist/public/static/Pretendard-Bold.otf', () => 1)
jest.mock('@expo-google-fonts/noto-serif-kr/500Medium/NotoSerifKR_500Medium.ttf', () => 1)
jest.mock('@expo-google-fonts/noto-serif-kr/700Bold/NotoSerifKR_700Bold.ttf', () => 1)
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}))
jest.mock('expo-share-intent', () => ({ ShareIntentProvider: ({ children }: { children: ReactNode }) => children }))
jest.mock('@/shared/observability/boot', () => ({ isSentryEnabled: false }))
// 기기 동기화(위젯 스냅샷·푸시 토큰)는 각자 테스트가 있다 — 여기서는 게이트만 본다
jest.mock('@/modules/widget/feature-widget-sync/useWidgetSync', () => ({ useWidgetSync: jest.fn() }))
jest.mock('@/shared/notifications/register-push-token', () => ({ usePushTokenRegistration: jest.fn() }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/shared/query-client', () => ({
  queryClient: jest.requireActual('@/test-utils/QueryTestProvider').createTestQueryClient(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').sharedMemoryTokenStore,
}))

const TOKENS = { accessToken: 'a', refreshToken: 'r' }

const stub = (label: string) => {
  const StubScreen = () => <Text>{label}</Text>
  return StubScreen
}

const TabsLayoutStub = () => (
  <>
    <Text>TABS_MOUNTED</Text>
    <Slot />
  </>
)

const ROUTES = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayoutStub,
  '(tabs)/index': stub('home'),
  '(tabs)/timeline': stub('timeline'),
  '(tabs)/album': stub('album'),
  '(tabs)/map': stub('map'),
  login: stub('login'),
  'onboarding/profile': stub('profile'),
  'pairing/index': stub('invite'),
  'pairing/join': stub('join'),
  'pairing/started-on': stub('started-on'),
  'settings/index': stub('settings'),
  'anniversaries/index': stub('anniversaries'),
}

const renderApp = async () => {
  const view = renderRouter(ROUTES)
  await view
  const rootStackRoutes = () => view.getRouterState()?.routes[0]?.state?.routes ?? []
  return { routeNames: () => rootStackRoutes().map((route) => route.name) }
}

beforeEach(() => {
  jest.clearAllMocks()
  queryClient.clear()
  memoryTokenStore.reset(null)
  jest.mocked(fetchMe).mockResolvedValue(ME)
})

describe('RootLayout — Stack.Protected 인증 게이트 (plan 0F.5 표)', () => {
  it('signedOut: 로그인 화면만 있고 탭은 마운트되지 않는다', async () => {
    await renderApp()
    expect(await screen.findByText('login')).toBeOnTheScreen()
    expect(screen.queryByText('TABS_MOUNTED')).toBeNull()
    expect(router.canGoBack()).toBe(false)
  })

  it('이름 없음: 프로필 화면', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, displayName: null, couple: null })
    await renderApp()
    expect(await screen.findByText('profile')).toBeOnTheScreen()
    expect(screen.queryByText('TABS_MOUNTED')).toBeNull()
  })

  it('미연결: 초대 코드 화면(/pairing)', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: null })
    await renderApp()
    expect(await screen.findByText('invite')).toBeOnTheScreen()
    expect(screen.queryByText('TABS_MOUNTED')).toBeNull()
  })

  it.each(['ACTIVE', 'UNLINKING'] as const)('%s: 탭(홈)', async (status) => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: ME.couple && { ...ME.couple, status } })
    await renderApp()
    expect(await screen.findByText('home')).toBeOnTheScreen()
    expect(screen.getByText('TABS_MOUNTED')).toBeOnTheScreen()
  })

  it('로그아웃하면 이전 화면이 스택에서 모두 빠지고 로그인만 남는다', async () => {
    memoryTokenStore.reset(TOKENS)
    const view = await renderApp()
    expect(await screen.findByText('home')).toBeOnTheScreen()
    await act(async () => router.push('/settings'))
    expect(await screen.findByText('settings')).toBeOnTheScreen()

    await act(() => session.endSession())

    expect(await screen.findByText('login')).toBeOnTheScreen()
    expect(view.routeNames()).toEqual(['login'])
  })

  it('미연결 상태에서 연결되면(상대가 코드 입력) 페어링 화면이 빠지고 탭이 열린다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: null })
    const view = await renderApp()
    expect(await screen.findByText('invite')).toBeOnTheScreen()

    await act(async () => {
      queryClient.setQueryData(['me'], ME)
    })

    expect(await screen.findByText('home')).toBeOnTheScreen()
    expect(view.routeNames()).toEqual(['(tabs)'])
  })

  it('홈에서 기념일 화면(/anniversaries)으로 갈 수 있다', async () => {
    memoryTokenStore.reset(TOKENS)
    await renderApp()
    expect(await screen.findByText('home')).toBeOnTheScreen()
    await act(async () => router.push('/anniversaries'))
    expect(await screen.findByText('anniversaries')).toBeOnTheScreen()
  })

  it('위젯 동기화를 켜고, 로그인한 사용자 id 로 푸시 토큰을 등록한다(로그아웃이면 null)', async () => {
    memoryTokenStore.reset(TOKENS)
    await renderApp()
    expect(await screen.findByText('home')).toBeOnTheScreen()
    expect(useWidgetSync).toHaveBeenCalled()
    expect(usePushTokenRegistration).toHaveBeenLastCalledWith(ME.id)

    await act(() => session.endSession())
    expect(await screen.findByText('login')).toBeOnTheScreen()
    expect(usePushTokenRegistration).toHaveBeenLastCalledWith(null)
  })
})
