import type { PickedImage } from '../data-access-media/prepare-image'
import { type ImageSource, pickImage } from './pick-image'

export const PHOTO_PERMISSION_MESSAGE = '설정에서 사진·카메라 접근을 허용해 주세요'

// 폼 콜백용: 사진 1장 또는 null. 권한 거부는 onDenied로 알린다
export const pickImageOrNull = async (source: ImageSource, onDenied: () => void): Promise<PickedImage | null> => {
  const result = await pickImage(source)
  if (result.status === 'denied') onDenied()
  return result.status === 'picked' ? result.image : null
}
