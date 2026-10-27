import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { Quote } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { deleteQuote, fetchQuotePage } from '../data-access-quote/quote-api'
import QuoteBoxScreen from '../feature-quote-box/QuoteBoxScreen'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('../data-access-quote/quote-api', () => ({ fetchQuotePage: jest.fn(), deleteQuote: jest.fn() }))
// 스크린샷 시트는 따로 검사한다 — 여기서는 열리는지만 본다
jest.mock('../feature-screenshot-save/ScreenshotSaveSheet', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return { __esModule: true, default: () => <Text>SCREENSHOT_SHEET</Text> }
})
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const quote = (id: string, overrides: Partial<Quote>): Quote => ({
  id: `01890a5d-ac96-774b-bcce-b302099a86${id}`,
  source: 'SHARE',
  text: null,
  speakerLabel: null,
  saidAt: null,
  memo: null,
  screenshotUrl: null,
  screenshotThumbUrl: null,
  createdAt: '2026-10-20T03:00:00.000Z',
  ...overrides,
})

const SHARED = quote('01', {
  text: '오늘 하루도 고생 많았어.',
  speakerLabel: '지은',
  saidAt: '2026-03-14T23:42:00+09:00',
})
const SHOT = quote('02', {
  source: 'SCREENSHOT',
  memo: '처음으로 길게 통화한 날',
  screenshotUrl: 'https://r2.test/q/s.jpg?sig=1',
  screenshotThumbUrl: 'https://r2.test/q/st.jpg?sig=1',
  createdAt: '2025-09-21T03:00:00.000Z',
})
const MINE = quote('03', { source: 'TXT', text: '메리 크리스마스', speakerLabel: '재명', saidAt: '2025-12-24T00:01:00+09:00' })

const renderBox = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <QuoteBoxScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(fetchQuotePage).mockResolvedValue({ items: [SHARED, SHOT, MINE], nextCursor: null })
  jest.mocked(deleteQuote).mockResolvedValue(undefined)
})

describe('QuoteBoxScreen (SCR-13)', () => {
  it('텍스트·스크린샷 문구 카드와 개수, 보낸 사람·날짜를 보여준다', async () => {
    await renderBox()
    expect(await screen.findByText('오늘 하루도 고생 많았어.')).toBeOnTheScreen()
    expect(screen.getByText('3개')).toBeOnTheScreen()
    expect(screen.getByText('2026. 03. 14 오후 11:42')).toBeOnTheScreen()
    expect(screen.getByText('처음으로 길게 통화한 날')).toBeOnTheScreen()
    expect(screen.getByText('2025. 09. 21')).toBeOnTheScreen()
    expect(screen.getByTestId(`quote-shot-${SHOT.id}`).props.source).toEqual({
      uri: SHOT.screenshotThumbUrl,
      cacheKey: `${SHOT.id}:st`,
    })
  })

  it('보낸 사람·스크린샷으로 거른다', async () => {
    await renderBox()
    await fireEvent.press(await screen.findByRole('button', { name: '지은' }))
    expect(screen.getByText('오늘 하루도 고생 많았어.')).toBeOnTheScreen()
    expect(screen.queryByText('메리 크리스마스')).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: '스크린샷' }))
    expect(screen.getByText('처음으로 길게 통화한 날')).toBeOnTheScreen()
    expect(screen.queryByText('오늘 하루도 고생 많았어.')).toBeNull()
  })

  it('더보기 → 지우기 → 확인하면 DELETE /quotes/:id', async () => {
    await renderBox()
    await fireEvent.press((await screen.findAllByRole('button', { name: '문구 더보기' }))[0]!)
    await fireEvent.press(screen.getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(deleteQuote).toHaveBeenCalledWith(SHARED.id))
  })

  it('빈 보관함: 추가하는 3가지 방법 — 대화 파일은 가져오기 화면, 스크린샷은 저장 시트', async () => {
    jest.mocked(fetchQuotePage).mockResolvedValue({ items: [], nextCursor: null })
    await renderBox()
    expect(await screen.findByText('카톡에서 공유하기')).toBeOnTheScreen()
    expect(screen.getByText(/대화 전체는 서버에 올라가지 않아요/)).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: /^대화 내보내기 파일 가져오기/ }))
    expect(router.push).toHaveBeenCalledWith('/quotes/import')

    await fireEvent.press(screen.getByRole('button', { name: /^스크린샷 저장/ }))
    expect(screen.getByText('SCREENSHOT_SHEET')).toBeOnTheScreen()
  })
})
