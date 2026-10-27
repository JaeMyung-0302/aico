import * as MediaLibrary from 'expo-media-library/legacy'
import { fetchPhotoOriginal } from '@/modules/media/data-access-media/media-api'
import { saveOriginalToLibrary, sniffImageExtension } from '../data-access-album/save-photo'

jest.mock('@/modules/media/data-access-media/media-api', () => ({ fetchPhotoOriginal: jest.fn() }))

const PHOTO_ID = '01890a5d-ac96-774b-bcce-b302099a8301'

const savedUri = (): string => String(jest.mocked(MediaLibrary.saveToLibraryAsync).mock.calls[0]?.[0])

beforeEach(() => {
  jest.clearAllMocks()
})

describe('saveOriginalToLibrary (원본 저장 확장자)', () => {
  it('서버가 mime 을 주면 그 형식의 확장자로 보관함에 저장한다 (매직 넘버를 읽지 않는다)', async () => {
    jest.mocked(fetchPhotoOriginal).mockResolvedValue({ url: 'https://r2.test/o?sig=1', expiresIn: 300, mime: 'image/png' })
    await saveOriginalToLibrary(PHOTO_ID)
    expect(savedUri()).toBe(`file:///cache/${PHOTO_ID}-original.png`)
  })

  it.each([
    ['image/heic', 'heic'],
    ['image/heif', 'heic'],
    ['image/jpeg', 'jpg'],
  ] as const)('mime %s → .%s', async (mime, extension) => {
    jest.mocked(fetchPhotoOriginal).mockResolvedValue({ url: 'https://r2.test/o?sig=1', expiresIn: 300, mime })
    await saveOriginalToLibrary(PHOTO_ID)
    expect(savedUri()).toBe(`file:///cache/${PHOTO_ID}-original.${extension}`)
  })

  it('매직 넘버: PNG·HEIC 시그니처를 알아본다', () => {
    expect(sniffImageExtension(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('png')
    expect(sniffImageExtension(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]))).toBe('heic')
    expect(sniffImageExtension(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('jpg')
  })
})
