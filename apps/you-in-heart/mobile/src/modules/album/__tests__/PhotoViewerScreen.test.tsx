import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import * as MediaLibrary from 'expo-media-library/legacy'
import { fetchDiaryEntry } from '@/modules/diary/data-access-diary/diary-api'
import { fetchPhoto, fetchPhotoOriginal } from '@/modules/media/data-access-media/media-api'
import { session } from '@/shared/auth/session'
import { DIARY_ENTRY, ENTRY_ID, makePhoto, PHOTO_IDS } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import PhotoViewerScreen from '../feature-photo-viewer/PhotoViewerScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/media/data-access-media/media-api', () => ({
  fetchPhoto: jest.fn(),
  fetchPhotoOriginal: jest.fn(),
}))
jest.mock('@/modules/diary/data-access-diary/diary-api', () => ({ fetchDiaryEntry: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const PHOTO_ID = PHOTO_IDS[1]

const renderViewer = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PhotoViewerScreen photoId={PHOTO_ID} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchPhoto).mockResolvedValue(makePhoto(PHOTO_ID))
  jest.mocked(fetchDiaryEntry).mockResolvedValue(DIARY_ENTRY)
  jest.mocked(fetchPhotoOriginal).mockResolvedValue({ url: 'https://r2.test/o?sig=5m', expiresIn: 300, mime: 'image/heic' })
})

describe('PhotoViewerScreen (SCR-09)', () => {
  it('표시용 이미지(cacheKey `${id}:d`)와 촬영 날짜 · 기록 안 몇 번째인지', async () => {
    await renderViewer()
    expect(await screen.findByText('2026. 10. 25 · 2 / 3')).toBeOnTheScreen()
    expect(screen.getByTestId('viewer-image').props.source).toEqual({
      uri: makePhoto(PHOTO_ID).displayUrl,
      cacheKey: `${PHOTO_ID}:d`,
    })
  })

  it('원본 저장은 위치 고지를 확인한 뒤에만 GET /photos/:id/original 을 부른다', async () => {
    await renderViewer()
    await fireEvent.press(await screen.findByRole('button', { name: '원본 저장' }))

    expect(screen.getByText('원본을 저장할까요?')).toBeOnTheScreen()
    expect(screen.getByText(/원본에는 촬영 위치와 시간이 포함돼요/)).toBeOnTheScreen()
    expect(fetchPhotoOriginal).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: '원본으로 저장' }))

    await waitFor(() => expect(fetchPhotoOriginal).toHaveBeenCalledWith(PHOTO_ID))
    await waitFor(() => expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('사진 보관함에 저장했어요')).toBeOnTheScreen()
  })

  it('고지에서 화면용 저장을 고르면 원본 URL 을 받지 않는다', async () => {
    await renderViewer()
    await fireEvent.press(await screen.findByRole('button', { name: '원본 저장' }))
    await fireEvent.press(screen.getByRole('button', { name: '화면용 저장' }))

    await waitFor(() => expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledTimes(1))
    expect(fetchPhotoOriginal).not.toHaveBeenCalled()
  })

  it('저장 권한이 없으면 원본 URL 을 받지 않고 안내한다', async () => {
    jest
      .mocked(MediaLibrary.getPermissionsAsync)
      .mockResolvedValueOnce({ granted: false, canAskAgain: false, status: MediaLibrary.PermissionStatus.DENIED, expires: 'never' })
    await renderViewer()
    await fireEvent.press(await screen.findByRole('button', { name: '원본 저장' }))
    await fireEvent.press(screen.getByRole('button', { name: '원본으로 저장' }))
    expect(await screen.findByText('설정에서 사진 저장을 허용해 주세요')).toBeOnTheScreen()
    expect(fetchPhotoOriginal).not.toHaveBeenCalled()
  })

  it('기록 보기는 일기 상세로', async () => {
    await renderViewer()
    await fireEvent.press(await screen.findByRole('button', { name: '기록 보기' }))
    expect(router.push).toHaveBeenCalledWith(`/diary/${ENTRY_ID}`)
  })
})
