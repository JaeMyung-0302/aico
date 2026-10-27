import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { computeDday } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { fetchAnniversaries } from '@/modules/anniversary/data-access-anniversary/anniversary-api'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, ANNIVERSARY_ITEMS, FIXED_NOW_MS, mockClockAt, ME, toSummary } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import HomeScreen from '../feature-home/HomeScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('@/modules/anniversary/data-access-anniversary/anniversary-api', () => ({ fetchAnniversaries: jest.fn() }))
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
  mockClockAt(FIXED_NOW_MS)
  await AsyncStorage.clear()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(fetchAnniversaries).mockResolvedValue(ANNIVERSARY_ITEMS)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('HomeScreen', () => {
  it('두 사람 이름과 함께한 일수(D-day)를 보여주고 배너는 없다', async () => {
    await renderHome()
    expect(await screen.findByText('재명 · 지은')).toBeOnTheScreen()
    expect(screen.getByLabelText(/^함께한 지 \d+일$/)).toBeOnTheScreen()
    expect(screen.getByText('2025. 09. 10부터')).toBeOnTheScreen()
    expect(screen.queryByText('연결 해제가 요청되었어요')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: '설정' }))
    expect(router.push).toHaveBeenCalledWith('/settings')
  })

  it('D-day 숫자는 shared computeDday 결과와 같다 (사귄 날 당일 = 1일)', async () => {
    const { days } = computeDday('2025-09-10', FIXED_NOW_MS)
    await renderHome()
    expect(await screen.findByLabelText(`함께한 지 ${days}일`)).toBeOnTheScreen()
    expect(days).toBe(413)
  })

  it('다음 기념일 카드는 오늘 이후 가장 가까운 기념일과 남은 일수를 보여주고 기념일 화면으로 간다', async () => {
    await renderHome()
    expect(await screen.findByText('500일 · 2027. 01. 22')).toBeOnTheScreen()
    expect(screen.getByText('D-87')).toBeOnTheScreen()
    expect(fetchAnniversaries).toHaveBeenCalledWith({ from: '2025-10-27', to: '2027-10-27' })
    await fireEvent.press(screen.getByRole('button', { name: /^다음 기념일/ }))
    expect(router.push).toHaveBeenCalledWith('/anniversaries')
  })

  it('간직한 문구 카드는 빈 상태에서 보관함 안내 문구를 보여준다', async () => {
    await renderHome()
    expect(await screen.findByText('간직한 문구')).toBeOnTheScreen()
    expect(screen.getByText('아직 간직한 문구가 없어요')).toBeOnTheScreen()
    expect(screen.getByText('카톡에서 마음에 남은 말을 문구 보관함에 담아 두세요')).toBeOnTheScreen()
  })

  it('위젯 추가 안내는 닫으면 다시 보이지 않는다', async () => {
    await renderHome()
    expect(await screen.findByText('홈 화면에 D-day 위젯 추가')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '안내 닫기' }))
    expect(screen.queryByText('홈 화면에 D-day 위젯 추가')).toBeNull()
    await waitFor(async () => expect(await AsyncStorage.getItem('home:widget-hint-dismissed')).toBe('1'))
  })

  it('위젯 안내를 이미 닫았으면 처음부터 보이지 않는다', async () => {
    await AsyncStorage.setItem('home:widget-hint-dismissed', '1')
    await renderHome()
    expect(await screen.findByText('간직한 문구')).toBeOnTheScreen()
    expect(screen.queryByText('홈 화면에 D-day 위젯 추가')).toBeNull()
  })

  it('UNLINKING 이면 유예 배너를 보여주고 다시 연결하기는 설정으로 간다', async () => {
    const unlinking = { ...ACTIVE_COUPLE, status: 'UNLINKING' as const, purgeAfter: '2026-11-26T03:00:00.000Z' }
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: toSummary(unlinking) })
    await renderHome()

    expect(await screen.findByText('연결 해제가 요청되었어요')).toBeOnTheScreen()
    expect(screen.getByText(/2026\. 11\. 26에 모든 기록이 삭제돼요/)).toBeOnTheScreen()
    // 시안 SCR-03 유예 중: 배너 + D-day + 최근 기록만 (쓰기로 이어지는 카드는 숨긴다)
    expect(screen.getByLabelText('함께한 지 413일')).toBeOnTheScreen()
    expect(screen.queryByText('홈 화면에 D-day 위젯 추가')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: '다시 연결하기' }))
    expect(router.push).toHaveBeenCalledWith('/settings')
  })

  it('사귄 날이 없으면 입력 카드를 보여주고 다음 기념일 카드는 없다', async () => {
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: { ...toSummary(ACTIVE_COUPLE), startedOn: null } })
    jest.mocked(fetchAnniversaries).mockResolvedValue([])
    await renderHome()
    await fireEvent.press(await screen.findByRole('button', { name: '사귄 날 입력하기' }))
    expect(router.push).toHaveBeenCalledWith('/pairing/started-on')
    expect(screen.queryByText('다음 기념일')).toBeNull()
    expect(screen.getByText('간직한 문구')).toBeOnTheScreen()
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
