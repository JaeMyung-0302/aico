import { fireEvent, render, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, ME, toSummary } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import HomeScreen from '../feature-home/HomeScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const renderHome = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <HomeScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
})

describe('HomeScreen', () => {
  it('두 사람 이름과 함께한 일수(D-day)를 보여주고 배너는 없다', async () => {
    await renderHome()
    expect(await screen.findByText('재명 · 지은')).toBeOnTheScreen()
    expect(screen.getByLabelText(/^함께한 지 \d+일$/)).toBeOnTheScreen()
    expect(screen.getByText('2025. 09. 10부터')).toBeOnTheScreen()
    expect(screen.queryByText('연결 해제가 요청되었어요')).toBeNull()
  })

  it('UNLINKING 이면 유예 배너를 보여주고 다시 연결하기는 설정으로 간다', async () => {
    const unlinking = { ...ACTIVE_COUPLE, status: 'UNLINKING' as const, purgeAfter: '2026-11-26T03:00:00.000Z' }
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: toSummary(unlinking) })
    await renderHome()

    expect(await screen.findByText('연결 해제가 요청되었어요')).toBeOnTheScreen()
    expect(screen.getByText(/2026\. 11\. 26에 모든 기록이 삭제돼요/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '다시 연결하기' }))
    expect(router.push).toHaveBeenCalledWith('/settings')
  })

  it('사귄 날이 없으면 입력 카드를 보여준다', async () => {
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: { ...toSummary(ACTIVE_COUPLE), startedOn: null } })
    await renderHome()
    await fireEvent.press(await screen.findByRole('button', { name: '사귄 날 입력하기' }))
    expect(router.push).toHaveBeenCalledWith('/pairing/started-on')
  })

  it('/me 를 못 받으면 SCR-18 서버 오류와 다시 시도를 보여준다', async () => {
    jest.mocked(fetchMe).mockRejectedValue(new Error('500'))
    await renderHome()
    expect(await screen.findByText('잠시 문제가 생겼어요')).toBeOnTheScreen()
    jest.mocked(fetchMe).mockResolvedValue(ME)
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('재명 · 지은')).toBeOnTheScreen()
  })
})
