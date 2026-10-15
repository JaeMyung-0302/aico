import { IMAGE_LONG_EDGE } from '@miri-pet/shared'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

export type PickedImage = { uri: string; width: number; height: number }

const JPEG_QUALITY = 0.8

// D8 클라이언트 단계: 긴 변 1440·JPEG 0.8 (업로드 용량 절약). EXIF 제거의 보장은 서버 재인코딩이 맡는다
export const resizeTarget = ({ width, height }: PickedImage): { width: number } | { height: number } | null => {
  if (Math.max(width, height) <= IMAGE_LONG_EDGE) return null
  return width >= height ? { width: IMAGE_LONG_EDGE } : { height: IMAGE_LONG_EDGE }
}

export const prepareImageForUpload = async (image: PickedImage): Promise<PickedImage> => {
  const context = ImageManipulator.manipulate(image.uri)
  const target = resizeTarget(image)
  const rendered = await (target ? context.resize(target) : context).renderAsync()
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG })
  return { uri: saved.uri, width: saved.width, height: saved.height }
}
