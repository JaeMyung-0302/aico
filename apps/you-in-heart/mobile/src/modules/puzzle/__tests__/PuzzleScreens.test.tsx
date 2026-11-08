import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchAnniversaries } from '@/modules/anniversary/data-access-anniversary/anniversary-api'
import { fetchPhotoPage } from '@/modules/media/data-access-media/media-api'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { FIXED_NOW_MS, mockClockAt } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { createPuzzle, fetchPuzzle } from '../data-access-puzzle/puzzle-api'
import PuzzleDetailScreen from '../feature-puzzle-detail/PuzzleDetailScreen'
import PuzzleStartScreen from '../feature-puzzle-start/PuzzleStartScreen'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('../data-access-puzzle/puzzle-api', () => ({
  fetchPuzzles: jest.fn(),
  fetchPuzzle: jest.fn(),
  createPuzzle: jest.fn(),
  deletePuzzle: jest.fn(),
}))
jest.mock('@/modules/media/data-access-media/media-api', () => ({ fetchPhotoPage: jest.fn() }))
jest.mock('@/modules/anniversary/data-access-anniversary/anniversary-api', () => ({ fetchAnniversaries: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const ID = '01890a5d-ac96-774b-bcce-b302099a8701'
const ENTRY = '01890a5d-ac96-774b-bcce-b302099a8702'
const photo = (n: number) => ({
  id: `01890a5d-ac96-774b-bcce-b302099a880${n}`,
  entryId: ENTRY,
  uploaderId: null,
  status: 'READY' as const,
  takenAt: null,
  width: 100,
  height: 100,
  thumbUrl: `https://x/t${n}.jpg`,
  displayUrl: `https://x/d${n}.jpg`,
})
// 오늘(2026-10-27 KST) = 7번째 칸. 0번만 채워져 있다
const detail = {
  id: ID,
  startsOn: '2026-10-20',
  endsOn: '2027-01-27',
  pieceCount: 100,
  filledCount: 1,
  status: 'ACTIVE' as const,
  backgroundUrl: 'https://x/d.jpg',
  createdAt: '2026-10-20T03:00:00.000Z',
  pieces: [{ dayIndex: 0, date: '2026-10-20', entryId: ENTRY, thumbUrl: 'https://x/t.jpg' }],
}

const renderWith = (node: React.ReactNode) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>{node}</QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await AsyncStorage.clear()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchAnniversaries).mockResolvedValue([])
  jest.mocked(fetchPhotoPage).mockResolvedValue({ items: [photo(1), photo(2)], nextCursor: null })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('PuzzleStartScreen (SCR-19b)', () => {
  it('기간과 퍼즐판 사진을 골라 시작하면 POST 후 돌아간다', async () => {
    jest.mocked(createPuzzle).mockResolvedValue(detail)
    await renderWith(<PuzzleStartScreen />)
    await fireEvent.press(screen.getByRole('radio', { name: '1년 · 365조각' }))
    const photos = await screen.findAllByRole('radio', { name: '퍼즐판 사진' })
    await fireEvent.press(photos[1])
    await fireEvent.press(screen.getByRole('button', { name: '퍼즐 시작하기' }))
    await waitFor(() => expect(router.back).toHaveBeenCalled())
    expect(jest.mocked(createPuzzle).mock.calls[0][0]).toEqual({ backgroundPhotoId: photo(2).id, pieceCount: 365 })
  })

  it('맞추는 중인 퍼즐이 있으면(409) 안내한다', async () => {
    jest
      .mocked(createPuzzle)
      .mockRejectedValue(new ApiError({ code: 'HTTP', message: 'x', status: 409, serverCode: 'PUZZLE_ALREADY_ACTIVE' }))
    await renderWith(<PuzzleStartScreen />)
    await screen.findAllByRole('radio', { name: '퍼즐판 사진' })
    await fireEvent.press(screen.getByRole('button', { name: '퍼즐 시작하기' }))
    expect(await screen.findByText('맞추는 중인 퍼즐이 이미 있어요')).toBeOnTheScreen()
    expect(router.back).not.toHaveBeenCalled()
  })

  it('사진이 더 있으면 다음 쪽을 불러와 오래된 사진도 고를 수 있다', async () => {
    jest
      .mocked(fetchPhotoPage)
      .mockResolvedValueOnce({ items: [photo(1)], nextCursor: photo(1).id })
      .mockResolvedValueOnce({ items: [photo(2)], nextCursor: null })
    await renderWith(<PuzzleStartScreen />)
    await fireEvent.press(await screen.findByRole('button', { name: '사진 더 보기' }))
    expect(await screen.findAllByRole('radio', { name: '퍼즐판 사진' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: '사진 더 보기' })).toBeNull()
  })

  it('사진이 없으면 시작할 수 없다', async () => {
    jest.mocked(fetchPhotoPage).mockResolvedValue({ items: [], nextCursor: null })
    await renderWith(<PuzzleStartScreen />)
    expect(await screen.findByText(/아직 올린 사진이 없어요/)).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '퍼즐 시작하기' })).toBeDisabled()
  })
})

describe('PuzzleDetailScreen (SCR-19e·19h)', () => {
  it('처음엔 오늘 칸, 빈 날이면 그 날짜로 기록 쓰기로 간다', async () => {
    jest.mocked(fetchPuzzle).mockResolvedValue(detail)
    await renderWith(<PuzzleDetailScreen puzzleId={ID} />)
    expect(await screen.findByText('10월 27일 화요일')).toBeOnTheScreen()
    expect(screen.getByText('8번째 날')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '10월 27일 조각 놓기' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/diary/new', params: { date: '2026-10-27' } })
  })

  it('채운 칸을 누르면 그 기록을 연다', async () => {
    jest.mocked(fetchPuzzle).mockResolvedValue(detail)
    await renderWith(<PuzzleDetailScreen puzzleId={ID} />)
    const board = await screen.findByRole('button', { name: '100조각 중 1조각이 놓인 퍼즐' })
    // 0번 칸(왼쪽 위)
    await fireEvent.press(board, { nativeEvent: { locationX: 1, locationY: 1 } })
    expect(screen.getByText('10월 20일 화요일')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '10월 20일 기록 보기' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/diary/[entryId]', params: { entryId: ENTRY } })
  })

  it('웹 클릭(locationX가 NaN)은 clientX − 판 위치로 칸을 고른다', async () => {
    jest.mocked(fetchPuzzle).mockResolvedValue(detail)
    await renderWith(<PuzzleDetailScreen puzzleId={ID} />)
    const board = await screen.findByRole('button', { name: '100조각 중 1조각이 놓인 퍼즐' })
    await fireEvent.press(board, {
      nativeEvent: { locationX: Number.NaN, locationY: Number.NaN, clientX: 101, clientY: 51 },
      currentTarget: { getBoundingClientRect: () => ({ left: 100, top: 50 }) },
    })
    expect(screen.getByText('10월 20일 화요일')).toBeOnTheScreen()
  })
})
