import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, FIXED_NOW_MS, ME, mockClockAt } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { createQuote } from '../data-access-quote/quote-api'
import ShareReceiveScreen from '../feature-share-receive/ShareReceiveScreen'
import { pendingShare } from '../util-share/pending-share'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('../data-access-quote/quote-api', () => ({ createQuote: jest.fn() }))
jest.mock('../feature-screenshot-save/ScreenshotSaveSheet', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    __esModule: true,
    default: ({ initialUri, onSaved }: { initialUri: string | null; onSaved: () => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel="시트 저장" onPress={onSaved}>
        <Text>{`SHEET:${initialUri}`}</Text>
      </Pressable>
    ),
  }
})
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const TEXT = '오늘 하루도 고생 많았어. 내일은 내가 데리러 갈게.'

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <ShareReceiveScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(createQuote).mockImplementation(async (body) => ({
    id: '01890a5d-ac96-774b-bcce-b302099a8601',
    source: 'SHARE',
    text: body.text,
    speakerLabel: body.speakerLabel ?? null,
    saidAt: body.saidAt ?? null,
    memo: body.memo ?? null,
    screenshotUrl: null,
    screenshotThumbUrl: null,
    createdAt: '2026-10-27T03:00:00.000Z',
  }))
  pendingShare.getState().clear()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ShareReceiveScreen (SCR-14)', () => {
  it('공유 받은 문구를 보여주고, 보낸 사람(기본 상대)·오늘 날짜·메모로 POST /quotes(source SHARE)', async () => {
    pendingShare.getState().set({ kind: 'text', text: TEXT })
    await renderScreen()
    expect(await screen.findByText(TEXT)).toBeOnTheScreen()
    expect(screen.getByText('2026년 10월 27일')).toBeOnTheScreen()
    await waitFor(() => expect(screen.getByRole('button', { name: '지은' })).toBeSelected())

    await fireEvent.changeText(screen.getByLabelText('메모 (선택)'), '퇴근길')
    await fireEvent.press(screen.getByRole('button', { name: '보관함에 저장' }))

    await waitFor(() =>
      expect(createQuote).toHaveBeenCalledWith({
        source: 'SHARE',
        text: TEXT,
        speakerLabel: '지은',
        saidAt: expect.stringMatching(/^2026-10-27T03:00:/),
        memo: '퇴근길',
      }),
    )
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/quotes'))
    expect(pendingShare.getState().payload).toBeNull()
  })

  it('보낸 사람을 나로 바꾸고 날짜를 고르면 그날 정오(KST)로 저장한다', async () => {
    pendingShare.getState().set({ kind: 'text', text: TEXT })
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '재명' }))
    await fireEvent.press(screen.getByRole('button', { name: /^보낸 날/ }))
    await fireEvent.changeText(screen.getByLabelText('날짜'), '20260314')
    await fireEvent.press(screen.getByRole('button', { name: '확인' }))
    expect(screen.getByText('2026년 3월 14일')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '보관함에 저장' }))
    await waitFor(() =>
      expect(createQuote).toHaveBeenCalledWith({
        source: 'SHARE',
        text: TEXT,
        speakerLabel: '재명',
        saidAt: '2026-03-14T12:00:00+09:00',
      }),
    )
  })

  it('문구 다듬기로 고친 내용을 저장한다', async () => {
    pendingShare.getState().set({ kind: 'text', text: TEXT })
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '문구 다듬기' }))
    await fireEvent.changeText(screen.getByLabelText('문구'), '내일은 내가 데리러 갈게.')
    await fireEvent.press(screen.getByRole('button', { name: '보관함에 저장' }))
    await waitFor(() =>
      expect(createQuote).toHaveBeenCalledWith(expect.objectContaining({ text: '내일은 내가 데리러 갈게.' })),
    )
  })

  it('미연결이면 "먼저 상대와 연결해 주세요" — 공유는 기억해 두고 연결하러 간다', async () => {
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: null })
    pendingShare.getState().set({ kind: 'text', text: TEXT })
    await renderScreen()
    expect(await screen.findByText('먼저 상대와 연결해 주세요')).toBeOnTheScreen()
    expect(screen.queryByText(TEXT)).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: '연결하러 가기' }))
    expect(router.replace).toHaveBeenCalledWith('/pairing')
    expect(pendingShare.getState().payload).toEqual({ kind: 'text', text: TEXT })
  })

  it('이미지는 스크린샷 저장 시트를 공유 받은 경로로 연다', async () => {
    pendingShare.getState().set({ kind: 'image', uri: 'file:///s/1.png' })
    await renderScreen()
    expect(await screen.findByText('SHEET:file:///s/1.png')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '시트 저장' }))
    expect(router.replace).toHaveBeenCalledWith('/quotes')
    expect(pendingShare.getState().payload).toBeNull()
  })

  it('받은 공유가 없으면 보관함으로 보낸다', async () => {
    await renderScreen()
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/quotes'))
  })
})
