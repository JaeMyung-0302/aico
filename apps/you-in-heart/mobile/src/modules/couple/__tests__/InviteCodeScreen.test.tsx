import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Share } from 'react-native'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { createInvite } from '../data-access-couple/couple-api'
import InviteCodeScreen from '../feature-pairing/InviteCodeScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn() },
}))
jest.mock('../data-access-couple/couple-api', () => ({ createInvite: jest.fn() }))

const MINUTE = 60_000

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <InviteCodeScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const inviteExpiringIn = (ms: number) => ({ code: 'K7MQ2X', expiresAt: new Date(Date.now() + ms).toISOString() })

beforeEach(() => jest.clearAllMocks())

describe('InviteCodeScreen', () => {
  it('들어오면 코드를 1번 만들고 6칸과 남은 시간을 보여준다', async () => {
    jest.mocked(createInvite).mockResolvedValue(inviteExpiringIn((23 * 60 + 41) * MINUTE + 30_000))
    await renderScreen()

    expect(await screen.findByText('23시간 41분 뒤 만료돼요')).toBeOnTheScreen()
    expect(['K', '7', 'M', 'Q', '2', 'X'].every((char) => screen.getByText(char))).toBe(true)
    expect(createInvite).toHaveBeenCalledTimes(1)
  })

  it('카카오톡으로 보내기는 코드를 담아 공유 시트를 연다', async () => {
    jest.mocked(createInvite).mockResolvedValue(inviteExpiringIn(60 * MINUTE + 30_000))
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })
    await renderScreen()
    await screen.findByText('1시간 0분 뒤 만료돼요')

    await fireEvent.press(screen.getByRole('button', { name: '카카오톡으로 보내기' }))

    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('K7MQ2X') })
  })

  it('만료된 코드면 안내와 함께 새 코드 만들기를 보여준다', async () => {
    jest.mocked(createInvite).mockResolvedValueOnce(inviteExpiringIn(-MINUTE))
    jest.mocked(createInvite).mockResolvedValueOnce(inviteExpiringIn(30 * MINUTE + 30_000))
    await renderScreen()
    expect(await screen.findByText('코드가 만료됐어요. 새 코드를 만들어 주세요')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '새 코드 만들기' }))

    expect(await screen.findByText('30분 뒤 만료돼요')).toBeOnTheScreen()
    expect(createInvite).toHaveBeenCalledTimes(2)
  })

  it('받은 코드 입력하기 → /pairing/join', async () => {
    jest.mocked(createInvite).mockResolvedValue(inviteExpiringIn(60 * MINUTE))
    await renderScreen()
    await fireEvent.press(screen.getByRole('button', { name: '받은 코드 입력하기' }))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/pairing/join'))
  })
})
