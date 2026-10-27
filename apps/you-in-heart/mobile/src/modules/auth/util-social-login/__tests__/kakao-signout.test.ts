import { initializeKakaoSDK } from '@react-native-kakao/core'
import { logout } from '@react-native-kakao/user'

// 네이티브 SDK 경계만 대체한다
jest.mock('@react-native-kakao/core', () => ({ initializeKakaoSDK: jest.fn(async () => undefined) }))
jest.mock('@react-native-kakao/user', () => ({ login: jest.fn(), logout: jest.fn(async () => undefined) }))

// 모듈 안의 초기화 상태를 테스트마다 새로 시작한다
const loadKakao = () => {
  let loaded: typeof import('../kakao') | undefined
  jest.isolateModules(() => {
    loaded = jest.requireActual<typeof import('../kakao')>('../kakao')
  })
  if (!loaded) throw new Error('kakao 모듈을 불러오지 못했습니다')
  return loaded
}

beforeEach(() => jest.clearAllMocks())

describe('signOutKakao', () => {
  it('카카오로 로그인한 적 없는 세션(개발 로그인·앱 재시작)에서도 SDK를 먼저 초기화한 뒤 로그아웃한다', async () => {
    const order: string[] = []
    jest.mocked(initializeKakaoSDK).mockImplementation(async () => {
      order.push('init')
    })
    jest.mocked(logout).mockImplementation(async () => {
      order.push('logout')
    })
    const { signOutKakao } = loadKakao()

    await signOutKakao()

    // 초기화 전에 logout을 부르면 Android 네이티브가 UninitializedPropertyAccessException으로 앱을 종료한다
    expect(order).toEqual(['init', 'logout'])
  })

  it('SDK 초기화가 실패하면 logout을 부르지 않고 실패를 돌려준다(앱을 죽이지 않는다)', async () => {
    jest.mocked(initializeKakaoSDK).mockRejectedValueOnce(new Error('no key'))
    const { signOutKakao } = loadKakao()

    await expect(signOutKakao()).rejects.toThrow('no key')
    expect(logout).not.toHaveBeenCalled()
  })
})
