import type { OriginalMime } from '@you-in-heart/shared'
import { File } from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library/legacy'

// 사진만 요청한다 (app.config 의 expo-media-library granularPermissions 와 같아야 한다)
const PHOTO_ONLY: MediaLibrary.GranularPermission[] = ['photo']
const PAGE_SIZE = 60

export type LibraryAsset = { id: string; uri: string; width: number; height: number; creationTime: number }

// 올릴 때 다시 읽는 값(저장하지 않는다). location 은 위치 동의가 꺼져 있으면 서버로 보내지 않는다
export type ResolvedAsset = {
  localUri: string
  mime: OriginalMime | null
  bytes: number
  takenAt: string | null
  location: { lat: number; lng: number } | null
}

// 보관함 읽기 권한: 이미 있으면 그대로, 다시 물을 수 있으면 묻는다. iOS "선택한 사진만"도 허용으로 본다
export const ensurePhotoPermission = async (): Promise<boolean> => {
  const current = await MediaLibrary.getPermissionsAsync(false, PHOTO_ONLY)
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const next = await MediaLibrary.requestPermissionsAsync(false, PHOTO_ONLY)
  return next.granted
}

// 원본 저장(쓰기 전용) 권한
export const ensureSavePermission = async (): Promise<boolean> => {
  const current = await MediaLibrary.getPermissionsAsync(true, PHOTO_ONLY)
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const next = await MediaLibrary.requestPermissionsAsync(true, PHOTO_ONLY)
  return next.granted
}

const toLibraryAsset = ({ id, uri, width, height, creationTime }: MediaLibrary.Asset): LibraryAsset => ({
  id,
  uri,
  width,
  height,
  creationTime,
})

// SCR-05 사진 고르기 그리드: 최근 사진부터 한 쪽씩
export const listRecentAssets = async ({ after }: { after?: string } = {}) => {
  const page = await MediaLibrary.getAssetsAsync({
    first: PAGE_SIZE,
    after,
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  })
  return { assets: page.assets.map(toLibraryAsset), endCursor: page.endCursor, hasNextPage: page.hasNextPage }
}

const MIME_BY_EXTENSION: Readonly<Record<string, OriginalMime>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  heic: 'image/heic',
  heif: 'image/heif',
  png: 'image/png',
}

// 서버가 받는 원본 형식만(JPEG·HEIC·HEIF·PNG). GIF·WebP·RAW 등은 null
export const originalMimeOf = (filename: string): OriginalMime | null => {
  const extension = filename.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase() ?? ''
  return Object.hasOwn(MIME_BY_EXTENSION, extension) ? (MIME_BY_EXTENSION[extension] ?? null) : null
}

// 촬영 시각이 없거나(0) 기기 시계 때문에 미래면 보내지 않는다(서버 TAKEN_AT_IN_FUTURE 방지)
const toTakenAt = (creationTime: number, nowMs: number): string | null =>
  creationTime > 0 && creationTime <= nowMs ? new Date(creationTime).toISOString() : null

// 업로드 직전에 자산의 실제 파일·촬영 시각·위치를 읽는다. 사진이 지워졌으면 null (iCloud 사진은 내려받는다)
export const resolveAsset = async (assetId: string): Promise<ResolvedAsset | null> => {
  const info = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: true }).catch(() => null)
  if (!info?.localUri) return null
  const { latitude, longitude } = info.location ?? {}
  return {
    localUri: info.localUri,
    mime: originalMimeOf(info.filename),
    bytes: new File(info.localUri).size,
    takenAt: toTakenAt(info.creationTime, Date.now()),
    location: typeof latitude === 'number' && typeof longitude === 'number' ? { lat: latitude, lng: longitude } : null,
  }
}
