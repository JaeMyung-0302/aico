import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { createAutoDays } from '@/modules/diary/data-access-diary/diary-api'
import { createUploadQueueStore, uploadKey, uploadQueue } from '@/modules/media/data-access-media/upload-queue-store'
import {
  countAssetsInRange,
  listAssetsByDateRange,
} from '@/modules/media/util-pick-assets/list-assets-by-date-range'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { FIXED_NOW_MS, mockClockAt, ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { startBulkImport } from '../data-access-album/start-bulk-import'
import BulkImportScreen from '../feature-bulk-import/BulkImportScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/diary/data-access-diary/diary-api', () => ({ createAutoDays: jest.fn() }))
jest.mock('@/modules/media/util-pick-assets/list-assets-by-date-range', () => ({
  ...jest.requireActual('@/modules/media/util-pick-assets/list-assets-by-date-range'),
  countAssetsInRange: jest.fn(),
  listAssetsByDateRange: jest.fn(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const OCT24 = '01890a5d-ac96-774b-bcce-b302099a8211'
const OCT25 = '01890a5d-ac96-774b-bcce-b302099a8212'
// KST 10/24 23:59 와 10/25 00:01 → 다른 날
const ASSETS = [
  { id: 'a1', creationTime: Date.parse('2026-10-24T14:59:00Z') },
  { id: 'a2', creationTime: Date.parse('2026-10-24T15:01:00Z') },
  { id: 'a3', creationTime: Date.parse('2026-10-25T03:00:00Z') },
]
const RANGE = { fromMs: Date.parse('2025-09-10T00:00:00+09:00'), toMs: FIXED_NOW_MS }

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  await AsyncStorage.clear()
  uploadQueue.getState().reset()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(countAssetsInRange).mockResolvedValue(3)
  jest.mocked(listAssetsByDateRange).mockResolvedValue(ASSETS)
  jest.mocked(createAutoDays).mockResolvedValue({
    entries: [
      { id: OCT24, happenedOn: '2026-10-24' },
      { id: OCT25, happenedOn: '2026-10-25' },
    ],
  })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('startBulkImport (SCR-08 일괄 등록)', () => {
  it('기간의 사진을 KST 날짜로 묶어 POST /diary/auto-days 를 1번 부르고, 날짜 엔트리별로 업로드 큐에 넣는다', async () => {
    const store = createUploadQueueStore()
    await store.persist.rehydrate()

    await expect(startBulkImport(RANGE, { store })).resolves.toEqual({ total: 3, skipped: 0 })

    expect(createAutoDays).toHaveBeenCalledTimes(1)
    expect(createAutoDays).toHaveBeenCalledWith(['2026-10-24', '2026-10-25'])
    expect(store.getState().items.map((item) => item.key)).toEqual([
      uploadKey(OCT24, 'a1'),
      uploadKey(OCT25, 'a2'),
      uploadKey(OCT25, 'a3'),
    ])
    expect(store.getState().bulk?.keys).toHaveLength(3)
  })

  it('중단 후 다시 시작해도 이미 올린 자산은 다시 올리지 않는다 (auto-days 는 멱등 → 같은 엔트리)', async () => {
    const store = createUploadQueueStore()
    await store.persist.rehydrate()
    await startBulkImport(RANGE, { store })
    store.getState().update(uploadKey(OCT24, 'a1'), { status: 'done', photoId: 'p1' })
    store.getState().update(uploadKey(OCT25, 'a2'), { status: 'uploading' })

    // 앱 종료 → 다시 실행: 저장소에서 복원하면 올리던 항목은 대기로
    const restored = createUploadQueueStore()
    await restored.persist.rehydrate()
    await startBulkImport(RANGE, { store: restored })

    expect(restored.getState().items.map((item) => [item.assetId, item.status])).toEqual([
      ['a1', 'done'],
      ['a2', 'queued'],
      ['a3', 'queued'],
    ])
  })

  it('366일이 넘으면 auto-days 를 366일씩 나눠 부른다', async () => {
    const days = Array.from({ length: 400 }, (_, index) => ({
      id: `d${index}`,
      creationTime: Date.parse('2024-01-01T03:00:00Z') + index * 86_400_000,
    }))
    jest.mocked(listAssetsByDateRange).mockResolvedValue(days)
    jest.mocked(createAutoDays).mockImplementation(async (dates) => ({
      entries: dates.map((date, index) => ({ id: `01890a5d-ac96-774b-bcce-${String(index).padStart(12, '0')}`, happenedOn: date })),
    }))
    const store = createUploadQueueStore()
    await store.persist.rehydrate()
    await startBulkImport(RANGE, { store })
    expect(jest.mocked(createAutoDays).mock.calls.map(([dates]) => dates.length)).toEqual([366, 34])
  })
})

describe('BulkImportScreen', () => {
  const renderScreen = () =>
    render(
      <SafeAreaTestProvider>
        <QueryTestProvider>
          <BulkImportScreen />
        </QueryTestProvider>
      </SafeAreaTestProvider>,
    )

  it('사귄 날부터 지금까지(기본)·최근 3개월 장수를 보여주고, 가져오기를 누르면 진행률을 보여준다', async () => {
    await renderScreen()
    expect(await screen.findByText('지금까지 찍은 사진을\n앨범에 모을까요?')).toBeOnTheScreen()
    expect(await screen.findByRole('button', { name: '사귄 날부터 지금까지 3장' })).toBeSelected()
    expect(screen.getByRole('button', { name: '최근 3개월 3장' })).toBeOnTheScreen()

    await fireEvent.press(screen.getByRole('button', { name: '가져오기' }))

    expect(await screen.findByText('0 / 3')).toBeOnTheScreen()
    // 사귄 날(KST 자정)부터 지금까지
    expect(listAssetsByDateRange).toHaveBeenCalledWith({
      fromMs: Date.parse('2025-09-10T00:00:00+09:00'),
      toMs: expect.any(Number),
    })

    await act(async () => {
      uploadQueue.getState().update(uploadKey(OCT24, 'a1'), { status: 'done' })
    })
    expect(screen.getByText('1 / 3')).toBeOnTheScreen()
  })

  it('일시정지하면 큐를 멈추고, 이어서 올리기로 다시 시작한다', async () => {
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '가져오기' }))
    await fireEvent.press(await screen.findByRole('button', { name: '일시정지' }))
    expect(uploadQueue.getState().isPaused).toBe(true)
    await fireEvent.press(screen.getByRole('button', { name: '이어서 올리기' }))
    expect(uploadQueue.getState().isPaused).toBe(false)
  })

  it('모두 올라가면 완료 안내', async () => {
    await renderScreen()
    await fireEvent.press(await screen.findByRole('button', { name: '가져오기' }))
    await waitFor(() => expect(uploadQueue.getState().bulk?.keys).toHaveLength(3))
    await act(async () => {
      uploadQueue.getState().bulk?.keys.forEach((key) => uploadQueue.getState().update(key, { status: 'done' }))
    })
    expect(await screen.findByText('사진 3장을 앨범에 모았어요')).toBeOnTheScreen()
  })
})
