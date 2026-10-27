import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { ApiError } from '@/shared/api/api-error'
import { ACTIVE_COUPLE } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { updateStartedOn } from '../data-access-couple/couple-api'
import StartedOnScreen from '../feature-pairing/StartedOnScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn() },
}))
jest.mock('../data-access-couple/couple-api', () => ({ updateStartedOn: jest.fn(), fetchCouple: jest.fn() }))

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <StartedOnScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const submit = async (digits: string) => {
  await fireEvent.changeText(screen.getByLabelText('사귄 날'), digits)
  await fireEvent.press(screen.getByRole('button', { name: '시작하기' }))
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(router.canGoBack).mockReturnValue(true)
})

describe('StartedOnScreen', () => {
  it('미래 날짜면 시작하기가 비활성이다', async () => {
    await renderScreen()
    await fireEvent.changeText(screen.getByLabelText('사귄 날'), '29991231')
    expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled()
  })

  it('숫자를 YYYY-MM-DD 로 맞춰 PATCH 하고 성공하면 돌아간다', async () => {
    jest.mocked(updateStartedOn).mockResolvedValue({ ...ACTIVE_COUPLE, startedOn: '2025-09-10' })
    await renderScreen()
    await submit('20250910')
    await waitFor(() => expect(updateStartedOn).toHaveBeenCalledWith('2025-09-10'))
    await waitFor(() => expect(router.back).toHaveBeenCalled())
  })

  it('409(연결 해제 유예 중)면 SCR-18 시트를 띄우고, 연결 상태 보기는 설정으로 간다', async () => {
    jest.mocked(updateStartedOn).mockRejectedValue(new ApiError({ code: 'HTTP', status: 409, message: 'x' }))
    await renderScreen()
    await submit('20250910')

    expect(await screen.findByText('지금은 새 기록을 남길 수 없어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '연결 상태 보기' }))
    expect(router.replace).toHaveBeenCalledWith('/settings')
  })

  it('그 밖의 실패는 입력칸 아래 안내만 보여준다', async () => {
    jest.mocked(updateStartedOn).mockRejectedValue(new ApiError({ code: 'HTTP', status: 500, message: 'x' }))
    await renderScreen()
    await submit('20250910')
    expect(await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(screen.queryByText('지금은 새 기록을 남길 수 없어요')).toBeNull()
  })

  it('나중에 입력할게요는 API 없이 돌아간다', async () => {
    await renderScreen()
    await fireEvent.press(screen.getByRole('button', { name: '나중에 입력할게요' }))
    expect(router.back).toHaveBeenCalled()
    expect(updateStartedOn).not.toHaveBeenCalled()
  })
})
