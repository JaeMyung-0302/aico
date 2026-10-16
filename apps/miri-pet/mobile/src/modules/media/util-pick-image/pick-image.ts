import * as ImagePicker from 'expo-image-picker'
import type { PickedImage } from '../data-access-media/prepare-image'

export type ImageSource = 'camera' | 'library'
export type PickImageResult = { status: 'picked'; image: PickedImage } | { status: 'cancelled' } | { status: 'denied' }

const requestPermission = (source: ImageSource) =>
  source === 'camera' ? ImagePicker.requestCameraPermissionsAsync() : ImagePicker.requestMediaLibraryPermissionsAsync()

// EXIF는 요청하지 않는다(위치 정보를 앱 메모리에도 올리지 않음). 원본 메타데이터는 서버 재인코딩이 지운다
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false }

export const pickImage = async (source: ImageSource): Promise<PickImageResult> => {
  const permission = await requestPermission(source)
  if (!permission.granted) return { status: 'denied' }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
  const asset = result.canceled ? undefined : result.assets[0]
  if (!asset) return { status: 'cancelled' }
  return { status: 'picked', image: { uri: asset.uri, width: asset.width, height: asset.height } }
}
