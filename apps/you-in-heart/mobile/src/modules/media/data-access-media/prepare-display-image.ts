import { DISPLAY_LONG_EDGE } from '@you-in-heart/shared'
import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

export const DISPLAY_JPEG_QUALITY = 0.85

type Size = { width: number; height: number }

// 긴 변만 DISPLAY_LONG_EDGE 로 맞춘다(작은 사진은 키우지 않는다). 비율은 라이브러리가 유지한다
const resizeFor = ({ width, height }: Size): { width: number } | { height: number } | null => {
  if (Math.max(width, height) <= DISPLAY_LONG_EDGE) return null
  return width >= height ? { width: DISPLAY_LONG_EDGE } : { height: DISPLAY_LONG_EDGE }
}

// 서버로 보낼 표시용 후보: 회전을 적용해 디코드한 실제 크기 기준으로 줄이고 JPEG q0.85 로 다시 저장한다.
// 서버가 이 후보를 다시 인코딩(EXIF 제거)해 d.jpg·t.jpg 를 만든다. 원본 바이트는 건드리지 않는다
export const prepareDisplayImage = async (uri: string): Promise<{ uri: string; width: number; height: number }> => {
  const decoded = await ImageManipulator.manipulate(uri).renderAsync()
  const resize = resizeFor(decoded)
  const image = resize ? await ImageManipulator.manipulate(decoded).resize(resize).renderAsync() : decoded
  return image.saveAsync({ format: SaveFormat.JPEG, compress: DISPLAY_JPEG_QUALITY })
}

// 올린 뒤 캐시에 남은 표시용 후보를 지운다(실패해도 OS 가 캐시를 정리한다)
export const discardFile = (uri: string): void => {
  try {
    new File(uri).delete()
  } catch {
    // 이미 지워졌거나 접근할 수 없는 파일
  }
}
