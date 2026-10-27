import type { Photo } from '@you-in-heart/shared'
import { File, Paths } from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library/legacy'
import { fetchPhotoOriginalUrl } from '@/modules/media/data-access-media/media-api'
import { discardFile } from '@/modules/media/data-access-media/prepare-display-image'
import { ensureSavePermission } from '@/modules/media/util-pick-assets/pick-assets'

export class SavePermissionError extends Error {
  constructor() {
    super('사진 저장 권한이 없어요')
    this.name = 'SavePermissionError'
  }
}

type ImageExtension = 'jpg' | 'png' | 'heic'

const MAGIC_LENGTH = 16
const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((value, index) => bytes[offset + index] === value)

// 원본 객체 키에는 확장자가 없다 → 앞 16바이트(매직 넘버)로 정한다. 보관함 저장에는 확장자가 필요하다
export const sniffImageExtension = (bytes: Uint8Array): ImageExtension => {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png'
  // ISO BMFF: 4..8 = 'ftyp' (HEIC·HEIF)
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return 'heic'
  return 'jpg'
}

const readHead = (file: File): Uint8Array => {
  const handle = file.open()
  try {
    return handle.readBytes(MAGIC_LENGTH)
  } finally {
    handle.close()
  }
}

// 캐시에 받아 보관함에 넣고 지운다(로그에 URL·경로를 남기지 않는다)
const saveDownloaded = async (url: string, name: string, extension?: ImageExtension): Promise<void> => {
  const downloaded = await File.downloadFileAsync(url, new File(Paths.cache, name), { idempotent: true })
  const target = new File(Paths.cache, `${name}.${extension ?? sniffImageExtension(readHead(downloaded))}`)
  discardFile(target.uri)
  downloaded.move(target)
  try {
    await MediaLibrary.saveToLibraryAsync(target.uri)
  } finally {
    discardFile(target.uri)
  }
}

// SCR-09 "원본 저장": 위치 고지를 확인한 뒤에만 부른다 → 5분 원본 URL(촬영 위치 EXIF 포함)
export const saveOriginalToLibrary = async (photoId: string): Promise<void> => {
  if (!(await ensureSavePermission())) throw new SavePermissionError()
  const url = await fetchPhotoOriginalUrl(photoId)
  await saveDownloaded(url, `${photoId}-original`)
}

// "화면용 저장": 서버가 EXIF(위치)를 지운 표시용 JPEG
export const saveDisplayToLibrary = async (photo: Photo): Promise<void> => {
  if (!photo.displayUrl) throw new Error('표시용 사진이 아직 없어요')
  if (!(await ensureSavePermission())) throw new SavePermissionError()
  await saveDownloaded(photo.displayUrl, `${photo.id}-display`, 'jpg')
}
