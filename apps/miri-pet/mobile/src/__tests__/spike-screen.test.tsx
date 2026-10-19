import { render, screen } from '@testing-library/react-native'
import SpikeRoute from '@/app/spike'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'

// 경계만 대체: 라우터(Redirect), 네이티브 SDK(카카오·Google·푸시·네이버맵)
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  }
})
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: {} }))
jest.mock('@react-native-kakao/core', () => ({ initializeKakaoSDK: jest.fn() }))
jest.mock('@react-native-kakao/user', () => ({ login: jest.fn() }))
jest.mock('expo-notifications', () => ({ requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn() }))
jest.mock('@/modules/places/ui-place-map/PlaceMap', () => () => null)

const setDev = (isDev: boolean) => {
  Object.defineProperty(globalThis, '__DEV__', { value: isDev, configurable: true, writable: true })
}

const renderSpike = () =>
  render(
    <SafeAreaTestProvider>
      <SpikeRoute />
    </SafeAreaTestProvider>,
  )

afterEach(() => setDev(true))

describe('spike (개발용 네이티브 검증 화면)', () => {
  it('개발 빌드(__DEV__)에서는 스파이크 화면을 그린다', async () => {
    setDev(true)
    await renderSpike()
    expect(screen.getByText('네이티브 스파이크')).toBeOnTheScreen()
  })

  it('프로덕션 빌드에서는 그리지 않고 홈(/)으로 보낸다', async () => {
    setDev(false)
    await renderSpike()
    expect(screen.queryByText('네이티브 스파이크')).not.toBeOnTheScreen()
    expect(screen.getByText('redirect:/')).toBeOnTheScreen()
  })
})
