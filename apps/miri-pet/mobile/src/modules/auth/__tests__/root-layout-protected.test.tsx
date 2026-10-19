import { router, Slot } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library'
import { Text } from 'react-native'
import RootLayout from '@/app/_layout'
import OnboardingPetScreen from '@/app/onboarding/pet'
import { createPet, fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { queryClient } from '@/shared/query-client'
import { sharedMemoryTokenStore as memoryTokenStore } from '@/test-utils/memory-token-store'

// 경계만 대체: 폰트·스플래시(네이티브), /me·펫 네트워크, 기기 저장소, 푸시·분석 SDK
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }))
jest.mock('pretendard/dist/public/static/Pretendard-Regular.otf', () => 1)
jest.mock('pretendard/dist/public/static/Pretendard-Medium.otf', () => 1)
jest.mock('pretendard/dist/public/static/Pretendard-SemiBold.otf', () => 1)
jest.mock('pretendard/dist/public/static/Pretendard-Bold.otf', () => 1)
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn(), createPet: jest.fn() }))
jest.mock('@/modules/notifications/util-push-registration', () => ({
  registerPushToken: jest.fn(() => Promise.resolve('denied')),
}))
jest.mock('@/modules/notifications/feature-push-navigation/usePushNavigation', () => ({
  usePushNavigation: () => undefined,
}))
jest.mock('@/modules/auth/util-social-login', () => ({ signOutSocialSdks: jest.fn(async () => undefined) }))
jest.mock('@/shared/observability/boot', () => ({ analytics: null }))
jest.mock('@/shared/query-client', () => ({
  queryClient: jest.requireActual('@/test-utils/QueryTestProvider').createTestQueryClient(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').sharedMemoryTokenStore,
}))

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
const TOKENS = { accessToken: 'a', refreshToken: 'r' }

const stub = (label: string) => {
  const StubScreen = () => <Text>{label}</Text>
  return StubScreen
}

// (tabs) 레이아웃이 마운트되면(= 홈 쿼리·DM 소켓이 돌면) TABS_MOUNTED가 보인다
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
  '(tabs)/pets': stub('my-pets'),
  '(tabs)/places': stub('places'),
  '(tabs)/dm': stub('dm-inbox'),
  login: stub('login'),
  consent: stub('consent'),
  'onboarding/pet': stub('onboarding-pet'),
  settings: stub('settings'),
  'settings/consents': stub('settings-consents'),
  notifications: stub('notifications'),
  spike: stub('spike'),
  'dm/[conversationId]': stub('dm-chat'),
  'pets/new': stub('pet-new'),
  'pets/[petId]/entry-card': stub('entry-card'),
  'pets/[petId]/vaccinations/new': stub('vaccination-new'),
  'places/[placeId]': stub('place-detail'),
  'places/report': stub('place-report'),
  'posts/[postId]': stub('post-detail'),
  'posts/new': stub('post-new'),
  'users/[userId]': stub('user-profile'),
}

// renderRouter 결과는 thenable이라 async 함수에서 그대로 반환하면 헬퍼(getRouterState)가 사라진다
const renderApp = async (routes: typeof ROUTES = ROUTES) => {
  const view = renderRouter(routes)
  await view
  // 컨테이너 상태는 __root 하나를 감싸고, 루트 Stack의 화면 목록은 그 안(state)에 있다
  const rootStackRoutes = () => view.getRouterState()?.routes[0]?.state?.routes ?? []
  return { routeNames: () => rootStackRoutes().map((route) => route.name) }
}

beforeEach(() => {
  jest.clearAllMocks()
  queryClient.clear()
  memoryTokenStore.reset(null)
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchMyPets).mockResolvedValue([PET])
})

describe('RootLayout — Stack.Protected 인증 게이트', () => {
  it('로그아웃 상태: 로그인 화면만 있고 (tabs)는 마운트되지 않는다', async () => {
    await renderApp()
    expect(await screen.findByText('login')).toBeOnTheScreen()
    expect(screen.queryByText('TABS_MOUNTED')).not.toBeOnTheScreen()
    expect(router.canGoBack()).toBe(false)
  })

  it('동의 전: 동의 화면만 있고 (tabs)는 마운트되지 않는다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, hasRequiredConsents: false })
    await renderApp()
    expect(await screen.findByText('consent')).toBeOnTheScreen()
    expect(screen.queryByText('TABS_MOUNTED')).not.toBeOnTheScreen()
    expect(fetchMyPets).not.toHaveBeenCalled()
  })

  it('펫 0마리: 펫 만들기 화면만 있고 (tabs)는 마운트되지 않는다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMyPets).mockResolvedValue([])
    await renderApp()
    expect(await screen.findByText('onboarding-pet')).toBeOnTheScreen()
    expect(screen.queryByText('TABS_MOUNTED')).not.toBeOnTheScreen()
    expect(router.canGoBack()).toBe(false)
  })

  it('로그인 + 동의 + 펫: 탭(홈)이 뜬다', async () => {
    memoryTokenStore.reset(TOKENS)
    await renderApp()
    expect(await screen.findByText('home')).toBeOnTheScreen()
    expect(screen.getByText('TABS_MOUNTED')).toBeOnTheScreen()
  })

  it('게이트가 판단하기 전(/me 조회 중)에는 아무 화면도 그리지 않고 스플래시를 유지한다', async () => {
    jest.mocked(fetchMe).mockImplementation(() => new Promise(() => undefined))
    await act(() => session.signIn(TOKENS))
    await renderApp()
    await waitFor(() => expect(fetchMe).toHaveBeenCalled())
    expect(screen.queryByText('TABS_MOUNTED')).not.toBeOnTheScreen()
    expect(screen.queryByText('home')).not.toBeOnTheScreen()
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled()
  })

  it('계정 전환: 로그아웃하면 이전 사용자의 화면이 스택에서 모두 빠지고, 다른 계정 로그인 후에도 뒤로 갈 곳이 없다', async () => {
    memoryTokenStore.reset(TOKENS)
    const view = await renderApp()
    expect(await screen.findByText('home')).toBeOnTheScreen()
    await act(async () => router.push('/settings'))
    expect(await screen.findByText('settings')).toBeOnTheScreen()

    await act(() => session.endSession())
    expect(await screen.findByText('login')).toBeOnTheScreen()
    expect(view.routeNames()).toEqual(['login'])
    expect(router.canGoBack()).toBe(false)

    // 두 번째 계정 (펫 없음)
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, id: '01890a5d-ac96-774b-bcce-b302099a8099' })
    jest.mocked(fetchMyPets).mockResolvedValue([])
    await act(() => session.signIn(TOKENS))
    expect(await screen.findByText('onboarding-pet')).toBeOnTheScreen()
    expect(view.routeNames()).toEqual(['onboarding/pet'])
    expect(screen.queryByText('TABS_MOUNTED')).not.toBeOnTheScreen()
  })

  it('로그인 화면에서 로그인하면 로그인 화면은 스택에서 빠진다 (뒤로 → 로그인 되돌이 방지)', async () => {
    const view = await renderApp()
    expect(await screen.findByText('login')).toBeOnTheScreen()
    memoryTokenStore.reset(TOKENS)
    await act(() => session.signIn(TOKENS))
    expect(await screen.findByText('home')).toBeOnTheScreen()
    expect(view.routeNames()).toEqual(['(tabs)'])
  })

  it('펫 만들기 완료(접종 기록 추가) → 내 펫 탭 위에 접종 폼이 쌓이고, 뒤로 가면 내 펫이다', async () => {
    memoryTokenStore.reset(TOKENS)
    jest.mocked(fetchMyPets).mockResolvedValue([])
    jest.mocked(createPet).mockResolvedValue(PET)
    const view = await renderApp({ ...ROUTES, 'onboarding/pet': OnboardingPetScreen })
    expect(await screen.findByText('함께 사는 아이를 소개해 주세요')).toBeOnTheScreen()

    jest.mocked(fetchMyPets).mockResolvedValue([PET])
    await fireEvent.changeText(screen.getByLabelText('이름'), '보리')
    await fireEvent.press(screen.getByRole('button', { name: '완료하고 접종 기록 추가하기' }))

    expect(await screen.findByText('vaccination-new')).toBeOnTheScreen()
    expect(view.routeNames()).toEqual(['(tabs)', 'pets/[petId]/vaccinations/new'])

    await act(async () => router.back())
    expect(await screen.findByText('my-pets')).toBeOnTheScreen()
  })
})
