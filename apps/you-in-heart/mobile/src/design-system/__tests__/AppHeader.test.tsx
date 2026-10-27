import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import AppHeader from '@/design-system/components/AppHeader'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() } }))

const renderHeader = async (props: Parameters<typeof AppHeader>[0] = {}) => {
  await render(
    <SafeAreaTestProvider>
      <AppHeader title="제목" {...props} />
    </SafeAreaTestProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AppHeader 뒤로', () => {
  it('돌아갈 화면이 있으면 router.back', async () => {
    jest.mocked(router.canGoBack).mockReturnValue(true)
    const user = await renderHeader()
    await user.press(screen.getByRole('button', { name: '뒤로' }))
    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('돌아갈 화면이 없으면(푸시·딥링크 콜드 스타트) 홈(/)으로 대체한다', async () => {
    jest.mocked(router.canGoBack).mockReturnValue(false)
    const user = await renderHeader()
    await user.press(screen.getByRole('button', { name: '뒤로' }))
    expect(router.replace).toHaveBeenCalledWith('/')
    expect(router.back).not.toHaveBeenCalled()
  })

  it('onBackPress가 있으면 기본 동작 대신 그것만 실행한다', async () => {
    const onBackPress = jest.fn()
    const user = await renderHeader({ onBackPress })
    await user.press(screen.getByRole('button', { name: '뒤로' }))
    expect(onBackPress).toHaveBeenCalledTimes(1)
    expect(router.back).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
