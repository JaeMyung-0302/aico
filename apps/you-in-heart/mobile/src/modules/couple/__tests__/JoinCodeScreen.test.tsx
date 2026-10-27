import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { joinCouple } from '../data-access-couple/couple-api'
import JoinCodeScreen from '../feature-pairing/JoinCodeScreen'

// 경계만 대체: 라우터, 커플 API(네트워크)
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn() },
}))
jest.mock('../data-access-couple/couple-api', () => ({ joinCouple: jest.fn() }))

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <JoinCodeScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const enterCode = async (code: string) => {
  await fireEvent.changeText(screen.getByLabelText('초대 코드'), code)
  await fireEvent.press(screen.getByRole('button', { name: '연결하기' }))
}

beforeEach(() => jest.clearAllMocks())

describe('JoinCodeScreen', () => {
  it('6자리가 아니면 연결하기가 비활성이다', async () => {
    await renderScreen()
    await fireEvent.changeText(screen.getByLabelText('초대 코드'), 'K7M')
    expect(screen.getByRole('button', { name: '연결하기' })).toBeDisabled()
  })

  it('소문자로 입력해도 대문자로 보낸다', async () => {
    jest.mocked(joinCouple).mockReturnValue(new Promise(() => undefined))
    await renderScreen()
    await enterCode('k7mq2x')
    await waitFor(() => expect(joinCouple).toHaveBeenCalledWith('K7MQ2X'))
  })

  it('404 응답이면 "코드를 확인해 주세요"를 보여준다', async () => {
    jest
      .mocked(joinCouple)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 404, message: '코드를 확인해 주세요' }))
    await renderScreen()
    await enterCode('K7MQ2Y')
    expect(await screen.findByRole('alert')).toHaveTextContent('코드를 확인해 주세요')
  })

  it('429 응답이면 시도 제한 문구를 보여준다', async () => {
    jest.mocked(joinCouple).mockRejectedValue(new ApiError({ code: 'HTTP', status: 429, message: 'Too Many' }))
    await renderScreen()
    await enterCode('K7MQ2Y')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '여러 번 틀려서 잠시 입력할 수 없어요. 10분 뒤에 다시 시도해 주세요',
    )
  })

  it('오류 뒤 코드를 고치면 오류 문구가 사라진다', async () => {
    jest.mocked(joinCouple).mockRejectedValue(new ApiError({ code: 'HTTP', status: 404, message: 'x' }))
    await renderScreen()
    await enterCode('K7MQ2Y')
    await screen.findByRole('alert')
    await fireEvent.changeText(screen.getByLabelText('초대 코드'), 'K7MQ2')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
