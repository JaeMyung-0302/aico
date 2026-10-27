import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchDiaryPage } from '@/modules/diary/data-access-diary/diary-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, DIARY_ENTRY, FIXED_NOW_MS, mockClockAt, ME, PHOTO_IDS } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import TimelineScreen from '../feature-timeline/TimelineScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('@/modules/diary/data-access-diary/diary-api', () => ({ fetchDiaryPage: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const SECOND_ENTRY = {
  ...DIARY_ENTRY,
  id: '01890a5d-ac96-774b-bcce-b302099a8202',
  happenedOn: '2026-09-19',
  title: '한강 피크닉',
  photos: [],
}
const OLDER_ENTRY = { ...SECOND_ENTRY, id: '01890a5d-ac96-774b-bcce-b302099a8203', title: '첫 여행', happenedOn: '2026-08-02' }

const renderTimeline = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <TimelineScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(fetchDiaryPage).mockImplementation(async ({ cursor }) =>
    cursor
      ? { items: [OLDER_ENTRY], nextCursor: null }
      : { items: [DIARY_ENTRY, SECOND_ENTRY], nextCursor: SECOND_ENTRY.id },
  )
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('TimelineScreen (SCR-07)', () => {
  it('최신순 카드: 제목·날짜·발췌·작성자, 사진 썸네일은 cacheKey `${id}:t`', async () => {
    await renderTimeline()
    expect(await screen.findByText('성수동 산책')).toBeOnTheScreen()
    expect(screen.getByText('10. 25 (일)')).toBeOnTheScreen()
    expect(screen.getByText('한강 피크닉')).toBeOnTheScreen()
    expect(screen.getAllByText('재명')).not.toHaveLength(0)
    expect(screen.getByTestId(`timeline-photo-${PHOTO_IDS[1]}`).props.source).toEqual({
      uri: DIARY_ENTRY.photos[1]?.thumbUrl,
      cacheKey: `${PHOTO_IDS[1]}:t`,
    })
    expect(screen.getByRole('button', { name: '2026년 10월' })).toBeOnTheScreen()
  })

  it('끝까지 내리면 nextCursor 로 다음 쪽을 받는다(더 없으면 멈춘다)', async () => {
    await renderTimeline()
    await screen.findByText('성수동 산책')
    await fireEvent(screen.getByTestId('timeline-list'), 'onEndReached')
    expect(await screen.findByText('첫 여행')).toBeOnTheScreen()
    expect(fetchDiaryPage).toHaveBeenLastCalledWith({ cursor: SECOND_ENTRY.id, before: undefined })

    await fireEvent(screen.getByTestId('timeline-list'), 'onEndReached')
    expect(fetchDiaryPage).toHaveBeenCalledTimes(2)
  })

  it('월 점프: 9월을 고르면 before=2026-10-01 로 다시 받는다', async () => {
    await renderTimeline()
    await fireEvent.press(await screen.findByRole('button', { name: '2026년 10월' }))
    await fireEvent.press(screen.getByRole('button', { name: '9월' }))
    await waitFor(() => expect(fetchDiaryPage).toHaveBeenLastCalledWith({ cursor: undefined, before: '2026-10-01' }))
  })

  it('카드를 누르면 상세, + 를 누르면 작성', async () => {
    await renderTimeline()
    await fireEvent.press(await screen.findByRole('button', { name: /^성수동 산책/ }))
    expect(router.push).toHaveBeenCalledWith(`/diary/${DIARY_ENTRY.id}`)
    await fireEvent.press(screen.getByRole('button', { name: '기록 쓰기' }))
    expect(router.push).toHaveBeenCalledWith('/diary/new')
  })

  it('빈 타임라인: 안내와 기록 남기기', async () => {
    jest.mocked(fetchDiaryPage).mockResolvedValue({ items: [], nextCursor: null })
    await renderTimeline()
    expect(await screen.findByText('첫 페이지를 채워볼까요?')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '기록 남기기' }))
    expect(router.push).toHaveBeenCalledWith('/diary/new')
  })

  it('불러오기 실패: 다시 시도', async () => {
    jest.mocked(fetchDiaryPage).mockRejectedValueOnce(new Error('down'))
    await renderTimeline()
    await fireEvent.press(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('성수동 산책')).toBeOnTheScreen()
  })
})
