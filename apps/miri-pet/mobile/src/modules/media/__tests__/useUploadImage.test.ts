import { act, renderHook, waitFor } from '@testing-library/react-native'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { completeUpload, createUpload, putToStorage, readFileSize } from '../data-access-media/media-api'
import { useUploadImage } from '../data-access-media/useUploadImage'

// 경계만 대체: 네이티브 이미지 처리, 서버 API·스토리지 PUT·로컬 파일 크기
const mockContext = { resize: jest.fn(), renderAsync: jest.fn() }
const mockSaveAsync = jest.fn()
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn(() => mockContext) },
  SaveFormat: { JPEG: 'jpeg' },
}))
jest.mock('../data-access-media/media-api', () => ({
  createUpload: jest.fn(),
  completeUpload: jest.fn(),
  putToStorage: jest.fn(),
  readFileSize: jest.fn(),
}))

const MEDIA_ID = '01890a5d-ac96-774b-bcce-b302099a8059'
const FILE_BYTES = 345_678

beforeEach(() => {
  jest.clearAllMocks()
  mockContext.resize.mockReturnValue(mockContext)
  mockContext.renderAsync.mockResolvedValue({ saveAsync: mockSaveAsync })
  mockSaveAsync.mockResolvedValue({ uri: 'file:///resized.jpg', width: 1440, height: 960 })
  jest.mocked(readFileSize).mockResolvedValue(FILE_BYTES)
  jest.mocked(createUpload).mockResolvedValue({
    mediaId: MEDIA_ID,
    uploadUrl: 'https://r2.test/incoming/x?X-Amz-Expires=300',
    headers: { 'Content-Type': 'image/jpeg' },
    expiresAt: '2026-10-15T00:05:00.000Z',
  })
  jest.mocked(putToStorage).mockResolvedValue(undefined)
  jest.mocked(completeUpload).mockResolvedValue({
    id: MEDIA_ID,
    status: 'READY',
    url: null,
    thumbUrl: null,
    width: 1440,
    height: 960,
  })
})

const renderUpload = () => renderHook(() => useUploadImage(), { wrapper: QueryTestProvider })

describe('useUploadImage', () => {
  it('긴 변 1440·JPEG 0.8로 줄인 뒤 presign → PUT → complete 순서로 올리고 mediaId를 돌려준다', async () => {
    const { result } = await renderUpload()
    let mediaId: string | undefined
    await act(async () => {
      mediaId = await result.current.upload({ uri: 'file:///big.jpg', width: 4032, height: 3024 }, 'CERTIFICATE')
    })

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///big.jpg')
    expect(mockContext.resize).toHaveBeenCalledWith({ width: 1440 })
    expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.8, format: SaveFormat.JPEG })
    expect(createUpload).toHaveBeenCalledWith({ purpose: 'CERTIFICATE', mime: 'image/jpeg', bytes: FILE_BYTES })
    expect(putToStorage).toHaveBeenCalledWith({
      uploadUrl: 'https://r2.test/incoming/x?X-Amz-Expires=300',
      headers: { 'Content-Type': 'image/jpeg' },
      fileUri: 'file:///resized.jpg',
    })
    expect(completeUpload).toHaveBeenCalledWith(MEDIA_ID)
    expect(mediaId).toBe(MEDIA_ID)
  })

  it('세로 사진은 높이를 1440으로 맞춘다', async () => {
    const { result } = await renderUpload()
    await act(async () => {
      await result.current.upload({ uri: 'file:///tall.jpg', width: 3024, height: 4032 }, 'POST')
    })
    expect(mockContext.resize).toHaveBeenCalledWith({ height: 1440 })
  })

  it('이미 1440 이하면 크기는 그대로 두고 JPEG로만 다시 저장한다', async () => {
    const { result } = await renderUpload()
    await act(async () => {
      await result.current.upload({ uri: 'file:///small.jpg', width: 800, height: 600 }, 'AVATAR')
    })
    expect(mockContext.resize).not.toHaveBeenCalled()
    expect(mockSaveAsync).toHaveBeenCalled()
  })

  it('complete가 실패하면 에러 상태가 되고 업로드 함수는 예외를 올린다', async () => {
    jest
      .mocked(completeUpload)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 422, message: '읽을 수 없어요' }))
    const { result } = await renderUpload()

    await act(async () => {
      await expect(
        result.current.upload({ uri: 'file:///big.jpg', width: 2000, height: 1000 }, 'POST'),
      ).rejects.toThrow('읽을 수 없어요')
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.errorMessage).toBe('사진을 올리지 못했어요. 다시 시도해 주세요')
    expect(result.current.isUploading).toBe(false)
  })
})
