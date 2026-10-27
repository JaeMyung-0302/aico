import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, DIARY_ENTRY, ENTRY_ID, FIXED_NOW_MS, mockClockAt, ME, PARTNER_ID, PHOTO_IDS } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { deleteDiary, fetchDiaryEntry, trackMemoryViewed } from '../data-access-diary/diary-api'
import DiaryDetailScreen from '../feature-diary-detail/DiaryDetailScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('../data-access-diary/diary-api', () => ({
  fetchDiaryEntry: jest.fn(),
  deleteDiary: jest.fn(),
  trackMemoryViewed: jest.fn(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const renderDetail = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <DiaryDetailScreen entryId={ENTRY_ID} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(fetchDiaryEntry).mockResolvedValue(DIARY_ENTRY)
  jest.mocked(deleteDiary).mockResolvedValue(undefined)
  jest.mocked(trackMemoryViewed).mockResolvedValue(undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('DiaryDetailScreen (SCR-06)', () => {
  it('날짜·사귄 지 며칠째·제목·본문·작성자를 보여주고, 화면을 열면 memory_viewed 1건', async () => {
    await renderDetail()
    expect(await screen.findByText('성수동 산책')).toBeOnTheScreen()
    // 사귄 날 2025-09-10 → 2026-10-25 는 411일째
    expect(screen.getByText('2026. 10. 25 (일) · 411일째')).toBeOnTheScreen()
    expect(screen.getByText(DIARY_ENTRY.body)).toBeOnTheScreen()
    expect(screen.getByText('재명이 남김')).toBeOnTheScreen()
    expect(trackMemoryViewed).toHaveBeenCalledTimes(1)
  })

  it('사진은 표시용 URL 을 cacheKey `${id}:d` 로 보여주고, 누르면 뷰어로 간다', async () => {
    await renderDetail()
    const first = await screen.findByTestId(`diary-photo-${PHOTO_IDS[0]}`)
    expect(first.props.source).toEqual({ uri: DIARY_ENTRY.photos[0]?.displayUrl, cacheKey: `${PHOTO_IDS[0]}:d` })
    await fireEvent.press(screen.getByRole('button', { name: '사진 1 / 3 크게 보기' }))
    expect(router.push).toHaveBeenCalledWith(`/photos/${PHOTO_IDS[0]}`)
  })

  it('작성자가 아니면 수정·삭제 메뉴가 없다', async () => {
    jest.mocked(fetchDiaryEntry).mockResolvedValue({ ...DIARY_ENTRY, authorId: PARTNER_ID })
    await renderDetail()
    expect(await screen.findByText('지은이 남김')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull()
  })

  it('작성자는 더보기 → 삭제 확인 다이얼로그에서 "삭제"를 눌러야 지운다', async () => {
    await renderDetail()
    await fireEvent.press(await screen.findByRole('button', { name: '더보기' }))
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }))
    expect(screen.getByText('이 기록을 삭제할까요?')).toBeOnTheScreen()
    expect(screen.getByText('사진 3장과 원본도 함께 지워지고, 되돌릴 수 없어요. 상대 화면에서도 사라져요.')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '취소' }))
    expect(deleteDiary).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: '더보기' }))
    await fireEvent.press(screen.getByRole('button', { name: '삭제하기' }))
    await fireEvent.press(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteDiary).toHaveBeenCalledWith(ENTRY_ID))
    await waitFor(() => expect(router.back).toHaveBeenCalled())
  })

  it('작성자는 수정하기로 작성 화면을 연다', async () => {
    await renderDetail()
    await fireEvent.press(await screen.findByRole('button', { name: '더보기' }))
    await fireEvent.press(screen.getByRole('button', { name: '수정하기' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/diary/new', params: { entryId: ENTRY_ID } })
  })

  it('없는 기록(404)이면 안내와 타임라인 이동', async () => {
    jest.mocked(fetchDiaryEntry).mockRejectedValue(new ApiError({ code: 'HTTP', status: 404, message: 'x' }))
    await renderDetail()
    expect(await screen.findByText('기록을 찾을 수 없어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '타임라인으로' }))
    expect(router.replace).toHaveBeenCalledWith('/timeline')
  })
})
