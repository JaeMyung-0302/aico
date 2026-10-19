import { act, render, screen, userEvent } from '@testing-library/react-native'
import { BackHandler } from 'react-native'
import ConsentScreen from '@/app/consent'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'

// 경계만 대체: 라우터, API, 로그아웃(서버·SDK·기기 저장소를 건드리는 뮤테이션)
const mockLogout = jest.fn()
jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => false } }))
jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))
jest.mock('@/modules/auth/data-access-auth/useLogout', () => ({
  useLogout: () => ({ mutate: mockLogout, isPending: false }),
}))

type BackListener = Parameters<typeof BackHandler.addEventListener>[1]
const BACK_EVENT = { type: 'hardwareBackPress', timeStamp: 0 }
let backListeners: BackListener[] = []

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <ConsentScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  backListeners = []
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    backListeners = [...backListeners, listener]
    return {
      remove: () => {
        backListeners = backListeners.filter((item) => item !== listener)
      },
    }
  })
})

describe('ConsentScreen (02 약관 동의) 뒤로', () => {
  it('헤더 뒤로 → 로그아웃', async () => {
    await renderScreen()
    await userEvent.setup().press(screen.getByRole('button', { name: '뒤로' }))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('Android 하드웨어 뒤로도 로그아웃하고 앱을 종료하지 않는다(true 반환)', async () => {
    await renderScreen()
    let results: (boolean | null | undefined)[] = []
    await act(async () => {
      results = backListeners.map((listener) => listener(BACK_EVENT))
    })
    expect(results).toContain(true)
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('화면을 떠나면 하드웨어 뒤로 리스너를 해제한다', async () => {
    const view = await renderScreen()
    expect(backListeners).toHaveLength(1)
    await view.unmount()
    expect(backListeners).toHaveLength(0)
  })
})
