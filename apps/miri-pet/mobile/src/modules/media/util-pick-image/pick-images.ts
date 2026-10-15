import * as ImagePicker from 'expo-image-picker'
import type { PickedImage } from '../data-access-media/prepare-image'

// 앨범에서 여러 장(고른 순서 유지). EXIF는 요청하지 않는다 — 단일 선택(pick-image)과 같은 원칙
const multiPickerOptions = (limit: number): ImagePicker.ImagePickerOptions => ({
  mediaTypes: ['images'],
  quality: 1,
  exif: false,
  allowsMultipleSelection: true,
  selectionLimit: limit,
  orderedSelection: true,
})

// 폼 콜백용: 최대 limit장(남은 자리), 없으면 빈 배열. 권한 거부는 onDenied로 알린다
export const pickImagesOrEmpty = async (limit: number, onDenied: () => void): Promise<PickedImage[]> => {
  if (limit <= 0) return []
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    onDenied()
    return []
  }
  const result = await ImagePicker.launchImageLibraryAsync(multiPickerOptions(limit))
  if (result.canceled) return []
  // 일부 플랫폼은 selectionLimit을 지키지 않는다 → 앞에서부터 limit장만
  return result.assets.slice(0, limit).map(({ uri, width, height }) => ({ uri, width, height }))
}
