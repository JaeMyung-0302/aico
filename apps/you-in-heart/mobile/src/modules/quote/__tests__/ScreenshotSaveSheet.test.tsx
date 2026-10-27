import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { LibraryAsset } from '@/modules/media/util-pick-assets/pick-assets'
import { putFileToTarget } from '@/modules/media/data-access-media/media-api'
import { discardFile, prepareDisplayImage } from '@/modules/media/data-access-media/prepare-display-image'
import { resolveAsset } from '@/modules/media/util-pick-assets/pick-assets'
import { ApiError } from '@/shared/api/api-error'
import { session } from '@/shared/auth/session'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { readFileSize } from '../data-access-quote/file-info'
import { completeScreenshot, createScreenshotUpload } from '../data-access-quote/quote-api'
import ScreenshotSaveSheet from '../feature-screenshot-save/ScreenshotSaveSheet'

jest.mock('../data-access-quote/quote-api', () => ({ createScreenshotUpload: jest.fn(), completeScreenshot: jest.fn() }))
jest.mock('../data-access-quote/file-info', () => ({ readFileSize: jest.fn(), readTextFile: jest.fn() }))
jest.mock('@/modules/media/data-access-media/media-api', () => ({ putFileToTarget: jest.fn() }))
jest.mock('@/modules/media/data-access-media/prepare-display-image', () => ({
  prepareDisplayImage: jest.fn(),
  discardFile: jest.fn(),
}))
jest.mock('@/modules/media/util-pick-assets/pick-assets', () => ({
  ensurePhotoPermission: jest.fn(async () => true),
  resolveAsset: jest.fn(),
}))
// 보관함 그리드(네이티브 보관함)는 사진 1장을 바로 고르는 대역
jest.mock('@/modules/diary/ui-photo-grid-picker/PhotoGridPicker', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native')
  const picked: LibraryAsset = { id: 'shot-1', uri: 'ph://shot-1', width: 1170, height: 2532, creationTime: 0 }
  return {
    __esModule: true,
    default: ({ onConfirm }: { onConfirm: (assets: LibraryAsset[]) => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel="스크린샷 1" onPress={() => onConfirm([picked])}>
        <Text>picker</Text>
      </Pressable>
    ),
  }
})
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const QUOTE_ID = '01890a5d-ac96-774b-bcce-b302099a8601'
const UPLOAD = { url: 'https://r2.test/q/incoming?sig=1', headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '2048' } }

const renderSheet = async (initialUri: string | null = 'file:///shared/shot.png') => {
  const handlers = { onClose: jest.fn(), onSaved: jest.fn() }
  await render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <ScreenshotSaveSheet isVisible initialUri={initialUri} {...handlers} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )
  return handlers
}

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(prepareDisplayImage).mockResolvedValue({ uri: 'file:///cache/display.jpg', width: 946, height: 2048, bytes: 2048 })
  jest.mocked(readFileSize).mockReturnValue(2048)
  jest.mocked(createScreenshotUpload).mockResolvedValue({ quoteId: QUOTE_ID, upload: UPLOAD, expiresIn: 300 })
  jest.mocked(putFileToTarget).mockResolvedValue(undefined)
  jest.mocked(completeScreenshot).mockResolvedValue({
    id: QUOTE_ID,
    source: 'SCREENSHOT',
    text: null,
    speakerLabel: null,
    saidAt: null,
    memo: '처음 통화',
    screenshotUrl: 'https://r2.test/q/s.jpg',
    screenshotThumbUrl: 'https://r2.test/q/st.jpg',
    createdAt: '2026-10-27T03:00:00.000Z',
  })
  jest.mocked(resolveAsset).mockResolvedValue({
    localUri: 'file:///DCIM/shot.png',
    mime: 'image/png',
    bytes: 900_000,
    takenAt: null,
    location: { lat: 37.5, lng: 127 },
  })
})

describe('ScreenshotSaveSheet (SCR-13 스크린샷 저장)', () => {
  it('표시용으로 줄인 JPEG 를 올리고(서명 헤더 그대로) 메모와 함께 complete 한다', async () => {
    const { onSaved } = await renderSheet()
    await fireEvent.changeText(screen.getByLabelText('메모 (선택)'), '  처음 통화 ')
    await fireEvent.press(screen.getByRole('button', { name: '보관함에 저장' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(prepareDisplayImage).toHaveBeenCalledWith('file:///shared/shot.png')
    expect(createScreenshotUpload).toHaveBeenCalledWith({ mime: 'image/jpeg', bytes: 2048, memo: '처음 통화' })
    expect(putFileToTarget).toHaveBeenCalledWith('file:///cache/display.jpg', UPLOAD)
    expect(completeScreenshot).toHaveBeenCalledWith(QUOTE_ID)
    expect(discardFile).toHaveBeenCalledWith('file:///cache/display.jpg')
  })

  it('보관함에서 고르면 그 사진을 쓴다 (촬영 위치는 보내지 않는다)', async () => {
    await renderSheet(null)
    await fireEvent.press(screen.getByRole('button', { name: '스크린샷 고르기' }))
    await fireEvent.press(await screen.findByRole('button', { name: '스크린샷 1' }))
    await fireEvent.press(await screen.findByRole('button', { name: '보관함에 저장' }))

    await waitFor(() => expect(completeScreenshot).toHaveBeenCalled())
    expect(resolveAsset).toHaveBeenCalledWith('shot-1')
    expect(prepareDisplayImage).toHaveBeenCalledWith('file:///DCIM/shot.png')
    expect(JSON.stringify(jest.mocked(createScreenshotUpload).mock.calls)).not.toContain('37.5')
  })

  it('서버가 처리 중(503 BUSY)이면 잠시 뒤 complete 를 다시 부른다', async () => {
    jest
      .mocked(completeScreenshot)
      .mockRejectedValueOnce(new ApiError({ code: 'HTTP', status: 503, message: 'x', serverCode: 'BUSY' }))
    const { onSaved } = await renderSheet()
    await fireEvent.press(screen.getByRole('button', { name: '보관함에 저장' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 })
    expect(completeScreenshot).toHaveBeenCalledTimes(2)
  })

  it('이미지를 읽을 수 없으면(422 INVALID_UPLOAD) 다른 사진을 고르게 한다', async () => {
    jest
      .mocked(completeScreenshot)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 422, message: 'x', serverCode: 'INVALID_UPLOAD' }))
    const { onSaved } = await renderSheet()
    await fireEvent.press(screen.getByRole('button', { name: '보관함에 저장' }))
    expect(await screen.findByText('이 이미지는 저장할 수 없어요. 다른 사진을 골라 주세요')).toBeOnTheScreen()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
