import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { MAX_QUOTE_REQUEST_BYTES } from '@you-in-heart/shared'
import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { readTextFile } from '../data-access-quote/file-info'
import { bulkCreateQuotes } from '../data-access-quote/quote-api'
import TxtImportScreen from '../feature-txt-import/TxtImportScreen'
import { utf8ByteLength } from '../util-quote/quote-batches'

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }))
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('../data-access-quote/file-info', () => ({ readTextFile: jest.fn(), readFileSize: jest.fn() }))
jest.mock('../data-access-quote/quote-api', () => ({ bulkCreateQuotes: jest.fn() }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

// 합성 Android 내보내기 (이름은 A·B)
const UNSELECTED_SAMPLE = '오늘 회의 너무 길었어'
const EXPORT = [
  'A님과 카카오톡 대화',
  '저장한 날짜 : 2026년 10월 27일 오후 1:00',
  '',
  '2026년 3월 14일 토요일',
  `2026년 3월 14일 오후 11:38, B : ${UNSELECTED_SAMPLE}`,
  '2026년 3월 14일 오후 11:42, B : 오늘 하루도 고생 많았어.',
  '내일은 내가 데리러 갈게.',
  '2026년 3월 14일 오후 11:43, A : 좋아 ㅎㅎ',
].join('\n')
const ORPHAN = '날짜 없는 이상한 줄'

const pickResult = (name = 'KakaoTalk_A.txt') => ({
  canceled: false as const,
  assets: [{ uri: `file:///cache/${name}`, name, size: 8_400_000, mimeType: 'text/plain', lastModified: 0 }],
})

const renderImport = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <TxtImportScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const openFile = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: '.txt 파일 고르기' }))
}

const sentBodies = () => jest.mocked(bulkCreateQuotes).mock.calls.map(([items]) => items)

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue(pickResult())
  jest.mocked(readTextFile).mockResolvedValue(EXPORT)
  jest.mocked(bulkCreateQuotes).mockImplementation(async (items) => ({ created: items.length }))
})

describe('TxtImportScreen (SCR-15)', () => {
  it('기기 안에서 파싱한 메시지를 보여주고, 고른 메시지만 POST /quotes/bulk 로 보낸다 (원문은 0회)', async () => {
    await renderImport()
    await openFile()

    expect(await screen.findByText('2026년 3월 14일 토요일')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('checkbox', { name: /오늘 하루도 고생 많았어/ }))
    await fireEvent.press(screen.getByRole('checkbox', { name: /좋아 ㅎㅎ/ }))
    expect(screen.getByText('2개 선택')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '2개 간직하기' }))

    await waitFor(() => expect(bulkCreateQuotes).toHaveBeenCalledTimes(1))
    expect(sentBodies()[0]).toEqual([
      { text: '오늘 하루도 고생 많았어.\n내일은 내가 데리러 갈게.', speakerLabel: 'B', saidAt: '2026-03-14T23:42:00+09:00' },
      { text: '좋아 ㅎㅎ', speakerLabel: 'A', saidAt: '2026-03-14T23:43:00+09:00' },
    ])
    const serialized = JSON.stringify(jest.mocked(bulkCreateQuotes).mock.calls)
    expect(serialized).not.toContain(UNSELECTED_SAMPLE)
    expect(serialized).not.toContain('카카오톡 대화')
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/quotes'))
  })

  it('못 읽은 줄은 원문 그대로 보여주고 문구로 고를 수 있다', async () => {
    jest.mocked(readTextFile).mockResolvedValue(`${ORPHAN}\n${EXPORT}`)
    await renderImport()
    await openFile()

    expect(await screen.findByText('1줄은 읽지 못했어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('checkbox', { name: ORPHAN }))
    await fireEvent.press(screen.getByRole('button', { name: '1개 간직하기' }))
    await waitFor(() => expect(sentBodies()[0]).toEqual([{ text: ORPHAN }]))
  })

  it('200건을 넘게 고르면 200건 단위(그리고 64KB 이하)로 나눠 보낸다', async () => {
    const many = Array.from(
      { length: 450 },
      (_, index) => `2026년 3월 14일 오후 ${(index % 12) + 1}:${String(index % 60).padStart(2, '0')}, A : 문구 ${index}`,
    )
    jest.mocked(readTextFile).mockResolvedValue(many.join('\n'))
    await renderImport()
    await openFile()

    await fireEvent.press(await screen.findByRole('button', { name: '모두 선택' }))
    await fireEvent.press(screen.getByRole('button', { name: '450개 간직하기' }))

    await waitFor(() => expect(bulkCreateQuotes).toHaveBeenCalledTimes(3))
    expect(sentBodies().map((items) => items.length)).toEqual([200, 200, 50])
    sentBodies().forEach((items) =>
      expect(utf8ByteLength(JSON.stringify({ items }))).toBeLessThanOrEqual(MAX_QUOTE_REQUEST_BYTES),
    )
  })

  it('카톡 형식이 아니거나 빈 파일이면 다른 파일을 고르게 한다', async () => {
    jest.mocked(readTextFile).mockResolvedValue('그냥 메모\n두 번째 줄')
    await renderImport()
    await openFile()
    expect(await screen.findByText('카톡 대화 파일이 아니에요')).toBeOnTheScreen()

    jest.mocked(readTextFile).mockResolvedValue('')
    await fireEvent.press(screen.getByRole('button', { name: '다른 파일 고르기' }))
    expect(await screen.findByText('카톡 대화 파일이 아니에요')).toBeOnTheScreen()
    expect(bulkCreateQuotes).not.toHaveBeenCalled()
  })

  it('파일 고르기를 취소하면 처음 화면에 머문다', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null })
    await renderImport()
    await openFile()
    expect(screen.getByRole('button', { name: '.txt 파일 고르기' })).toBeOnTheScreen()
    expect(readTextFile).not.toHaveBeenCalled()
  })
})
