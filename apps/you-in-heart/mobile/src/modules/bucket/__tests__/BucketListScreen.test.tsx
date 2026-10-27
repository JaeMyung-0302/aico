import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { BucketItem } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { fetchDiaryPage } from '@/modules/diary/data-access-diary/diary-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { DIARY_ENTRY, ENTRY_ID, ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import {
  createBucketItem,
  deleteBucketItem,
  fetchBucketItems,
  updateBucketItem,
} from '../data-access-bucket/bucket-api'
import BucketListScreen from '../feature-bucket-list/BucketListScreen'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('../data-access-bucket/bucket-api', () => ({
  fetchBucketItems: jest.fn(),
  createBucketItem: jest.fn(),
  updateBucketItem: jest.fn(),
  deleteBucketItem: jest.fn(),
}))
jest.mock('@/modules/diary/data-access-diary/diary-api', () => ({ fetchDiaryPage: jest.fn() }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const item = (id: string, title: string, overrides: Partial<BucketItem> = {}): BucketItem => ({
  id: `01890a5d-ac96-774b-bcce-b302099a85${id}`,
  title,
  doneAt: null,
  entryId: null,
  createdAt: '2026-10-01T03:00:00.000Z',
  ...overrides,
})

const SUNRISE = item('01', '일출 보러 가기')
const COOKING = item('02', '같이 요리 클래스 듣기')
const PICNIC = item('03', '한강에서 피크닉', { doneAt: '2026-05-10T03:00:00.000Z', entryId: ENTRY_ID })
const PHOTO = item('04', '커플 사진 찍기', { doneAt: '2026-05-20T03:00:00.000Z' })
const ITEMS = [SUNRISE, COOKING, PICNIC, PHOTO]

const renderBucket = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <BucketListScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchBucketItems).mockResolvedValue(ITEMS)
  jest.mocked(fetchDiaryPage).mockResolvedValue({ items: [DIARY_ENTRY], nextCursor: null })
  jest.mocked(updateBucketItem).mockImplementation(async (id, body) => ({
    ...(ITEMS.find((bucket) => bucket.id === id) ?? SUNRISE),
    doneAt: body.done ? '2026-10-27T03:00:00.000Z' : null,
    entryId: body.entryId ?? null,
  }))
  jest.mocked(deleteBucketItem).mockResolvedValue(undefined)
})

describe('BucketListScreen (SCR-12)', () => {
  it('진행률과 해보고 싶어요·해냈어요 목록, 연결된 기록 보기', async () => {
    await renderBucket()
    expect(await screen.findByText('2 / 4')).toBeOnTheScreen()
    expect(screen.getByText('해보고 싶어요')).toBeOnTheScreen()
    expect(screen.getByText('해냈어요')).toBeOnTheScreen()
    expect(screen.getByRole('checkbox', { name: '일출 보러 가기' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: '한강에서 피크닉' })).toBeChecked()
    expect(screen.getByText('2026. 05')).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '기록 보기' }))
    expect(router.push).toHaveBeenCalledWith(`/diary/${ENTRY_ID}`)
  })

  it('입력칸에 적고 보내면 POST /bucket (앞뒤 공백 제거), 빈 제목은 보내지 않는다', async () => {
    jest.mocked(createBucketItem).mockResolvedValue(item('05', '제주도 한 달 살기'))
    await renderBucket()
    const input = await screen.findByLabelText('새로운 버킷리스트')
    await fireEvent.changeText(input, '   ')
    await fireEvent(input, 'submitEditing')
    expect(createBucketItem).not.toHaveBeenCalled()

    await fireEvent.changeText(input, '  제주도 한 달 살기 ')
    await fireEvent(input, 'submitEditing')
    await waitFor(() => expect(createBucketItem).toHaveBeenCalledWith({ title: '제주도 한 달 살기' }))
    await waitFor(() => expect(fetchBucketItems).toHaveBeenCalledTimes(2))
  })

  it('완료하면 기록 연결 시트: 기록을 골라 연결하기 → PATCH {done, entryId}', async () => {
    await renderBucket()
    await fireEvent.press(await screen.findByRole('checkbox', { name: '일출 보러 가기' }))

    expect(await screen.findByText('일출 보러 가기, 해냈어요')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '연결하기' })).toBeDisabled()
    await fireEvent.press(await screen.findByRole('radio', { name: /^성수동 산책/ }))
    await fireEvent.press(screen.getByRole('button', { name: '연결하기' }))

    await waitFor(() => expect(updateBucketItem).toHaveBeenCalledWith(SUNRISE.id, { done: true, entryId: ENTRY_ID }))
    await waitFor(() => expect(screen.queryByText('일출 보러 가기, 해냈어요')).toBeNull())
  })

  it('연결 없이 완료 → PATCH {done:true}', async () => {
    await renderBucket()
    await fireEvent.press(await screen.findByRole('checkbox', { name: '같이 요리 클래스 듣기' }))
    await fireEvent.press(await screen.findByRole('button', { name: '연결 없이 완료' }))
    await waitFor(() => expect(updateBucketItem).toHaveBeenCalledWith(COOKING.id, { done: true }))
  })

  it('완료한 항목을 다시 누르면 완료 취소 → PATCH {done:false}', async () => {
    await renderBucket()
    await fireEvent.press(await screen.findByRole('checkbox', { name: '커플 사진 찍기' }))
    await waitFor(() => expect(updateBucketItem).toHaveBeenCalledWith(PHOTO.id, { done: false }))
  })

  it('길게 누르면 삭제 확인 → 삭제', async () => {
    await renderBucket()
    await fireEvent(await screen.findByRole('checkbox', { name: '같이 요리 클래스 듣기' }), 'longPress')
    expect(screen.getByText('이 항목을 지울까요?')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(deleteBucketItem).toHaveBeenCalledWith(COOKING.id))
  })

  it('목록이 비어 있으면 안내를 보여준다', async () => {
    jest.mocked(fetchBucketItems).mockResolvedValue([])
    await renderBucket()
    expect(await screen.findByText('둘이 함께 하고 싶은 것을 적어 보세요')).toBeOnTheScreen()
    expect(screen.getByText('0 / 0')).toBeOnTheScreen()
  })

  it('연결 해제 유예 중(409)에 추가하면 SCR-18 시트를 띄운다', async () => {
    jest
      .mocked(createBucketItem)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 409, message: 'x', serverCode: 'COUPLE_UNLINKING' }))
    await renderBucket()
    const input = await screen.findByLabelText('새로운 버킷리스트')
    await fireEvent.changeText(input, '일출')
    await fireEvent(input, 'submitEditing')
    expect(await screen.findByText('지금은 새 기록을 남길 수 없어요')).toBeOnTheScreen()
  })
})
