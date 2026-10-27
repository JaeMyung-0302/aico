import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import {
  ACTIVE_COUPLE,
  ANNIVERSARY_ITEMS,
  CUSTOM_ANNIVERSARY_ID,
  FIXED_NOW_MS,
  mockClockAt,
  ME,
  toSummary,
} from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import {
  createAnniversary,
  deleteAnniversary,
  fetchAnniversaries,
  updateAnniversary,
} from '../data-access-anniversary/anniversary-api'
import AnniversariesScreen from '../feature-anniversaries/AnniversariesScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('../data-access-anniversary/anniversary-api', () => ({
  fetchAnniversaries: jest.fn(),
  createAnniversary: jest.fn(),
  updateAnniversary: jest.fn(),
  deleteAnniversary: jest.fn(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <AnniversariesScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const SAVED = { id: CUSTOM_ANNIVERSARY_ID, title: '처음 만난 날', date: '2025-08-23' }

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchAnniversaries).mockResolvedValue(ANNIVERSARY_ITEMS)
  jest.mocked(createAnniversary).mockResolvedValue(SAVED)
  jest.mocked(updateAnniversary).mockResolvedValue(SAVED)
  jest.mocked(deleteAnniversary).mockResolvedValue(undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('AnniversariesScreen (SCR-04)', () => {
  it('다가오는 자동 기념일·우리가 정한 날·지난 기념일을 나눠 보여준다', async () => {
    await renderScreen()

    const upcoming = within(await screen.findByLabelText('다가오는 기념일'))
    expect(upcoming.getByText('500일')).toBeOnTheScreen()
    expect(upcoming.getByText('2027. 01. 22 (금)')).toBeOnTheScreen()
    expect(upcoming.getByText('D-87')).toBeOnTheScreen()
    expect(upcoming.getByText('2주년')).toBeOnTheScreen()
    expect(upcoming.getByText('D-318')).toBeOnTheScreen()
    expect(upcoming.queryByText('처음 만난 날')).toBeNull()

    const customs = within(screen.getByLabelText('우리가 정한 날'))
    expect(customs.getByText('처음 만난 날')).toBeOnTheScreen()
    expect(customs.getByText('매년 08. 23')).toBeOnTheScreen()
    expect(customs.getByText('D-300')).toBeOnTheScreen()

    const past = within(screen.getByLabelText('지난 기념일'))
    expect(past.getByText('400일')).toBeOnTheScreen()
    expect(past.getByText('2026. 10. 14')).toBeOnTheScreen()
    expect(past.getByText('1주년')).toBeOnTheScreen()
  })

  it('우리가 정한 날이 없으면 추가 안내를 보여준다', async () => {
    jest.mocked(fetchAnniversaries).mockResolvedValue(ANNIVERSARY_ITEMS.filter((item) => item.kind !== 'CUSTOM'))
    await renderScreen()
    expect(await screen.findByText('생일처럼 둘만의 날을 추가해 보세요')).toBeOnTheScreen()
  })

  it('기념일 추가 → 시트에서 저장하면 POST 하고 목록을 다시 받는다', async () => {
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '기념일 추가' }))
    await fireEvent.changeText(screen.getByLabelText('이름'), '지은 생일')
    await fireEvent.changeText(screen.getByLabelText('날짜'), '19990314')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(createAnniversary).toHaveBeenCalledWith({ title: '지은 생일', date: '1999-03-14' }))
    await waitFor(() => expect(fetchAnniversaries).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText('기념일 추가', { exact: true })).toBeNull())
  })

  it('우리가 정한 날을 누르면 수정 시트가 열리고, 날짜를 안 바꾸면 제목만 PATCH 한다', async () => {
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '처음 만난 날 수정' }))
    expect(screen.getByText('기념일 수정')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('이름'), '첫 만남')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(updateAnniversary).toHaveBeenCalledWith(CUSTOM_ANNIVERSARY_ID, { title: '첫 만남' }))
  })

  it('수정 시트에서 날짜를 바꾸면 날짜도 보낸다', async () => {
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '처음 만난 날 수정' }))
    await fireEvent.changeText(screen.getByLabelText('날짜'), '20250824')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))
    await waitFor(() =>
      expect(updateAnniversary).toHaveBeenCalledWith(CUSTOM_ANNIVERSARY_ID, {
        title: '처음 만난 날',
        date: '2025-08-24',
      }),
    )
  })

  it('수정 시트에서 삭제하면 DELETE 한다', async () => {
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '처음 만난 날 수정' }))
    await fireEvent.press(screen.getByRole('button', { name: '기념일 삭제' }))
    await waitFor(() => expect(deleteAnniversary).toHaveBeenCalledWith(CUSTOM_ANNIVERSARY_ID))
  })

  it('저장이 409(연결 해제 유예 중)면 SCR-18 시트를 띄운다', async () => {
    jest.mocked(createAnniversary).mockRejectedValue(new ApiError({ code: 'HTTP', status: 409, message: 'x' }))
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '기념일 추가' }))
    await fireEvent.changeText(screen.getByLabelText('이름'), '생일')
    await fireEvent.changeText(screen.getByLabelText('날짜'), '19990314')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('지금은 새 기록을 남길 수 없어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '연결 상태 보기' }))
    expect(router.replace).toHaveBeenCalledWith('/settings')
  })

  it('그 밖의 저장 실패는 시트 안에 안내한다', async () => {
    jest.mocked(createAnniversary).mockRejectedValue(new ApiError({ code: 'HTTP', status: 500, message: 'x' }))
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '기념일 추가' }))
    await fireEvent.changeText(screen.getByLabelText('이름'), '생일')
    await fireEvent.changeText(screen.getByLabelText('날짜'), '19990314')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
  })

  it('연결 해제 유예 중에는 읽기만 한다 (추가 버튼·수정 없음)', async () => {
    const unlinking = { ...ACTIVE_COUPLE, status: 'UNLINKING' as const, purgeAfter: '2026-11-26T03:00:00.000Z' }
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: toSummary(unlinking) })
    await renderScreen()
    const customs = within(await screen.findByLabelText('우리가 정한 날'))
    expect(customs.getByText('처음 만난 날')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '기념일 추가' })).toBeNull()
    expect(screen.queryByRole('button', { name: '처음 만난 날 수정' })).toBeNull()
  })

  it('목록을 못 받으면 서버 오류와 다시 시도를 보여준다', async () => {
    jest.mocked(fetchAnniversaries).mockRejectedValue(new Error('500'))
    await renderScreen()
    expect(await screen.findByText('잠시 문제가 생겼어요')).toBeOnTheScreen()
    jest.mocked(fetchAnniversaries).mockResolvedValue(ANNIVERSARY_ITEMS)
    await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('500일')).toBeOnTheScreen()
  })
})
