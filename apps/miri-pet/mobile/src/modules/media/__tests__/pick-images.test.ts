import * as ImagePicker from 'expo-image-picker'
import { pickImagesOrEmpty } from '../util-pick-image/pick-images'

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}))

type LibraryPermission = Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>
const permission = (granted: boolean): LibraryPermission => ({
  granted,
  canAskAgain: true,
  expires: 'never',
  status: granted ? ImagePicker.PermissionStatus.GRANTED : ImagePicker.PermissionStatus.DENIED,
})
const asset = (n: number) => ({ uri: `file:///photo-${n}.jpg`, width: 100 * n, height: 50 * n, assetId: null, type: 'image' as const })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(permission(true))
})

describe('pickImagesOrEmpty (앨범 여러 장)', () => {
  it('여러 장을 고른 순서대로 돌려준다 — 다중 선택·순서 표시·남은 장수 제한·EXIF 요청 안 함', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue({ canceled: false, assets: [asset(1), asset(2), asset(3)] })

    await expect(pickImagesOrEmpty(5, jest.fn())).resolves.toEqual([
      { uri: 'file:///photo-1.jpg', width: 100, height: 50 },
      { uri: 'file:///photo-2.jpg', width: 200, height: 100 },
      { uri: 'file:///photo-3.jpg', width: 300, height: 150 },
    ])
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      orderedSelection: true,
    })
  })

  it('플랫폼이 제한보다 많이 돌려줘도 앞에서부터 limit장만', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue({ canceled: false, assets: [asset(1), asset(2), asset(3)] })
    const images = await pickImagesOrEmpty(2, jest.fn())
    expect(images.map((image) => image.uri)).toEqual(['file:///photo-1.jpg', 'file:///photo-2.jpg'])
  })

  it('남은 자리가 0 이하면 권한도 묻지 않고 빈 배열', async () => {
    await expect(pickImagesOrEmpty(0, jest.fn())).resolves.toEqual([])
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled()
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('권한 거부 → onDenied 호출 + 빈 배열, 선택 창을 열지 않는다', async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(permission(false))
    const onDenied = jest.fn()
    await expect(pickImagesOrEmpty(3, onDenied)).resolves.toEqual([])
    expect(onDenied).toHaveBeenCalledTimes(1)
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('취소 → 빈 배열', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null })
    await expect(pickImagesOrEmpty(3, jest.fn())).resolves.toEqual([])
  })
})
