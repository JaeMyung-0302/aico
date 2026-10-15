import * as ImagePicker from 'expo-image-picker'
import { pickImage } from '../util-pick-image/pick-image'

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}))

type CameraPermission = Awaited<ReturnType<typeof ImagePicker.requestCameraPermissionsAsync>>
const permission = (granted: boolean): CameraPermission => ({
  granted,
  canAskAgain: true,
  expires: 'never',
  status: granted ? ImagePicker.PermissionStatus.GRANTED : ImagePicker.PermissionStatus.DENIED,
})
const ASSET = { uri: 'file:///photo.jpg', width: 4032, height: 3024, assetId: null, type: 'image' as const }

beforeEach(() => jest.clearAllMocks())

describe('pickImage', () => {
  it('카메라: 권한 허용 → 촬영 결과(uri·크기)를 돌려준다, EXIF는 요청하지 않는다', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue(permission(true))
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [ASSET] })

    await expect(pickImage('camera')).resolves.toEqual({ status: 'picked', image: { uri: ASSET.uri, width: 4032, height: 3024 } })
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1, exif: false })
  })

  it('앨범: 권한 거부면 denied (선택 창을 열지 않는다)', async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(permission(false))
    await expect(pickImage('library')).resolves.toEqual({ status: 'denied' })
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('사용자가 취소하면 cancelled', async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(permission(true))
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null })
    await expect(pickImage('library')).resolves.toEqual({ status: 'cancelled' })
  })
})
