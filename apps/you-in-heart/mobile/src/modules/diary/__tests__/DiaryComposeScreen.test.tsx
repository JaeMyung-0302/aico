import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import * as MediaLibrary from 'expo-media-library/legacy'
import { Linking } from 'react-native'
import { createPlace, reversePlace } from '@/modules/map/data-access-place/place-api'
import { uploadKey, uploadQueue } from '@/modules/media/data-access-media/upload-queue-store'
import { ensurePhotoPermission, listRecentAssets, type LibraryAsset } from '@/modules/media/util-pick-assets/pick-assets'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { DIARY_ENTRY, ENTRY_ID, FIXED_NOW_MS, mockClockAt, ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { createDiary, fetchDiaryEntry, updateDiary } from '../data-access-diary/diary-api'
import DiaryComposeScreen from '../feature-diary-compose/DiaryComposeScreen'

const mockRequestApi = jest.fn<Promise<unknown>, [unknown]>(async () => undefined)
jest.mock('@/shared/api/api-client', () => ({ requestApi: (options: unknown) => mockRequestApi(options) }))
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('../data-access-diary/diary-api', () => ({
  createDiary: jest.fn(),
  updateDiary: jest.fn(),
  fetchDiaryEntry: jest.fn(),
  trackMemoryViewed: jest.fn(),
}))
jest.mock('@/modules/media/util-pick-assets/pick-assets', () => ({
  ensurePhotoPermission: jest.fn(),
  listRecentAssets: jest.fn(),
}))
jest.mock('@/modules/map/data-access-place/place-api', () => ({
  reversePlace: jest.fn(),
  createPlace: jest.fn(),
  searchPlaces: jest.fn(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const asset = (index: number): LibraryAsset => ({
  id: `asset-${index}`,
  uri: `ph://asset-${index}`,
  width: 4032,
  height: 3024,
  creationTime: FIXED_NOW_MS - index * 60_000,
})
const LIBRARY = Array.from({ length: 21 }, (_, index) => asset(index + 1))

const renderCompose = (entryId?: string) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <DiaryComposeScreen entryId={entryId} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const pickPhotos = async (count: number) => {
  await fireEvent.press(screen.getByRole('button', { name: /^사진 추가/ }))
  for (const index of Array.from({ length: count }, (_, i) => i + 1)) {
    await fireEvent.press(await screen.findByRole('button', { name: `사진 ${index}` }))
  }
}

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  uploadQueue.getState().reset()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(ensurePhotoPermission).mockResolvedValue(true)
  jest.mocked(listRecentAssets).mockResolvedValue({ assets: LIBRARY, endCursor: 'end', hasNextPage: false })
  jest.mocked(createDiary).mockResolvedValue({ ...DIARY_ENTRY, photos: [] })
  jest.mocked(updateDiary).mockResolvedValue(DIARY_ENTRY)
  jest.mocked(fetchDiaryEntry).mockResolvedValue(DIARY_ENTRY)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('DiaryComposeScreen (SCR-05)', () => {
  it('오늘 날짜(KST)로 시작하고, 아무것도 쓰지 않으면 저장할 수 없다', async () => {
    await renderCompose()
    expect(screen.getByRole('button', { name: '날짜 2026. 10. 27 (화)' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('21번째 사진은 안내 후 막고 20장까지만 담는다', async () => {
    await renderCompose()
    await pickPhotos(21)

    expect(screen.getByText('사진은 한 기록에 20장까지 담을 수 있어요')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '사진 21' })).not.toBeSelected()
    await fireEvent.press(screen.getByRole('button', { name: '추가 20' }))

    expect(await screen.findByRole('button', { name: '사진 추가 20/20' })).toBeDisabled()
  })

  it('사진 권한이 없으면 안내와 설정 열기를 보여준다', async () => {
    jest.mocked(ensurePhotoPermission).mockResolvedValue(false)
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
    await renderCompose()
    await fireEvent.press(screen.getByRole('button', { name: /^사진 추가/ }))

    expect(await screen.findByText('사진에 접근할 수 없어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '설정 열기' }))
    expect(openSettings).toHaveBeenCalled()
    expect(listRecentAssets).not.toHaveBeenCalled()
  })

  it('저장하면 POST /diary 후 고른 사진을 업로드 큐에 넣는다. memory_created 는 서버가 남기므로 앱 이벤트는 0건', async () => {
    await renderCompose()
    await fireEvent.changeText(screen.getByLabelText('제목'), '성수동 산책')
    await fireEvent.changeText(screen.getByLabelText('본문'), '오래 걸었던 날.')
    await pickPhotos(2)
    await fireEvent.press(screen.getByRole('button', { name: '추가 2' }))
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(createDiary).toHaveBeenCalledWith({ happenedOn: '2026-10-27', title: '성수동 산책', body: '오래 걸었던 날.' }),
    )
    await waitFor(() =>
      expect(uploadQueue.getState().items.map((item) => item.key)).toEqual([
        uploadKey(ENTRY_ID, 'asset-1'),
        uploadKey(ENTRY_ID, 'asset-2'),
      ]),
    )
    expect(screen.getByText('저장하는 중…')).toBeOnTheScreen()
    expect(screen.getByText('0 / 2')).toBeOnTheScreen()
    const eventCalls = mockRequestApi.mock.calls.filter(([options]) => JSON.stringify(options).includes('/events'))
    expect(eventCalls).toEqual([])
    // 위치 동의가 꺼져 있으면(ME) 사진 위치를 읽지도, 장소를 제안하지도 않는다
    expect(MediaLibrary.getAssetInfoAsync).not.toHaveBeenCalled()
    expect(screen.queryByText(/곳을 찾았어요/)).toBeNull()
  })

  it('위치 동의가 켜져 있으면 저장 뒤 사진 위치로 찾은 곳을 제안하고, 시트를 닫기 전에는 상세로 가지 않는다', async () => {
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, consents: { ...ME.consents, location: true } })
    jest.mocked(reversePlace).mockResolvedValue('서울 성동구 성수동1가 685-20')
    const location = { latitude: 37.5444, longitude: 127.0374 }
    jest.mocked(MediaLibrary.getAssetInfoAsync).mockImplementation(async () => ({
      ...asset(1),
      filename: 'IMG.HEIC',
      mediaType: 'photo',
      duration: 0,
      modificationTime: 0,
      albumId: '',
      location,
    }))
    await renderCompose()
    await fireEvent.changeText(screen.getByLabelText('본문'), '서울숲 산책')
    await pickPhotos(2)
    await fireEvent.press(screen.getByRole('button', { name: '추가 2' }))
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('새로 다녀온 곳 1곳을 찾았어요')).toBeOnTheScreen()
    expect(screen.getByRole('checkbox', { name: '성수동1가 근처' })).toBeChecked()
    expect(createPlace).not.toHaveBeenCalled()

    await act(async () => {
      uploadQueue.getState().update(uploadKey(ENTRY_ID, 'asset-1'), { status: 'done', photoId: 'p1' })
      uploadQueue.getState().update(uploadKey(ENTRY_ID, 'asset-2'), { status: 'done', photoId: 'p2' })
    })
    expect(router.replace).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: '나중에' }))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/diary/${ENTRY_ID}`))
    expect(createPlace).not.toHaveBeenCalled()
  })

  it('일부 사진이 실패하면 안내와 다시 올리기를 보여주고, 모두 끝나면 상세로 간다', async () => {
    await renderCompose()
    await fireEvent.changeText(screen.getByLabelText('본문'), '한강 피크닉')
    await pickPhotos(2)
    await fireEvent.press(screen.getByRole('button', { name: '추가 2' }))
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(uploadQueue.getState().items).toHaveLength(2))

    await act(async () => {
      uploadQueue.getState().update(uploadKey(ENTRY_ID, 'asset-1'), { status: 'done', photoId: 'p1' })
      uploadQueue.getState().update(uploadKey(ENTRY_ID, 'asset-2'), { status: 'failed', failure: 'RETRYABLE' })
    })

    expect(await screen.findByText('사진 1장을 올리지 못했어요')).toBeOnTheScreen()
    await fireEvent.press(screen.getAllByRole('button', { name: '다시 올리기' })[0]!)
    expect(uploadQueue.getState().items[1]?.status).toBe('queued')

    await act(async () => {
      uploadQueue.getState().update(uploadKey(ENTRY_ID, 'asset-2'), { status: 'done', photoId: 'p2' })
    })
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/diary/${ENTRY_ID}`))
  })

  it('사진 없이 저장하면 바로 상세로 간다', async () => {
    await renderCompose()
    await fireEvent.changeText(screen.getByLabelText('본문'), '짧은 하루')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/diary/${ENTRY_ID}`))
    expect(uploadQueue.getState().items).toEqual([])
  })

  it('수정: 기존 글을 채우고 PATCH 로 저장한다. 기존 사진 수만큼 더 담을 수 있는 장수가 줄어든다', async () => {
    await renderCompose(ENTRY_ID)
    expect(await screen.findByDisplayValue('성수동 산책')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '사진 추가 3/20' })).toBeOnTheScreen()

    await fireEvent.changeText(screen.getByLabelText('제목'), '성수동 산책 2')
    await fireEvent.press(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(updateDiary).toHaveBeenCalledWith(ENTRY_ID, {
        happenedOn: '2026-10-25',
        title: '성수동 산책 2',
        body: DIARY_ENTRY.body,
      }),
    )
    await waitFor(() => expect(router.back).toHaveBeenCalled())
  })
})
