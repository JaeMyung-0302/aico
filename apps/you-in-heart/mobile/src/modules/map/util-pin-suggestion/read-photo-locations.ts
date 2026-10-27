import * as MediaLibrary from 'expo-media-library/legacy'
import type { PhotoLocation } from './cluster-photo-locations'

const readOne = async (assetId: string): Promise<PhotoLocation | null> => {
  // 위치만 필요하다 → iCloud 원본은 내려받지 않는다
  const info = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: false }).catch(() => null)
  const { latitude, longitude } = info?.location ?? {}
  if (!info || typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return { assetId, lat: latitude, lng: longitude, takenAtMs: info.creationTime }
}

// 고른 사진의 촬영 위치(위치가 없는 사진은 뺀다). 호출 쪽이 위치 동의를 확인한 뒤에만 부른다
export const readPhotoLocations = async (assetIds: readonly string[]): Promise<PhotoLocation[]> => {
  const located = await Promise.all(assetIds.map(readOne))
  return located.filter((location): location is PhotoLocation => location !== null)
}
