import { randomBytes } from 'node:crypto'
import { IMAGE_LONG_EDGE, IMAGE_THUMB_EDGE } from '@miri-pet/shared'
import type { MediaBucket, MediaStatus } from '../generated/prisma'
import type { StoredObject } from './object-storage'

// D7 키 규칙
// - 업로드 원본: private incoming/{mediaId} (미처리 원본은 공개 경로가 없다. complete 뒤 재PUT도 같은 키로 다시 지운다)
// - 공개 이미지: public p/{mediaId}/1440.jpg + 480.jpg  (Media.key = 1440 경로 → Phase 1 publicMediaUrl 규칙과 같다)
// - 증명서: private c/{ownerId}/{mediaId}.jpg           (Media.key = 그 경로)
// - 장소 제보 사진: private r/{ownerId}/{mediaId}.jpg     (운영자 검수용 증빙, Media.key = 그 경로)
export const incomingKeyOf = (mediaId: string): string => `incoming/${mediaId}`
export const certificateKey = (ownerId: string, mediaId: string): string => `c/${ownerId}/${mediaId}.jpg`
export const placeReportKey = (ownerId: string, mediaId: string): string => `r/${ownerId}/${mediaId}.jpg`
export const publicMainKey = (mediaId: string): string => `p/${mediaId}/${IMAGE_LONG_EDGE}.jpg`
export const publicThumbKey = (mediaId: string): string => `p/${mediaId}/${IMAGE_THUMB_EDGE}.jpg`

type MediaLocation = { id: string; bucket: MediaBucket; key: string; status: MediaStatus }

// incoming 키를 id에서 계산하려고 insert 전에 id를 만든다. Prisma 기본값과 같은 uuid v7(앞 48비트 = ms 시각)
export const newMediaId = (): string => {
  const time = Date.now().toString(16).padStart(12, '0')
  const rand = randomBytes(10).toString('hex')
  const variant = ((parseInt(rand.charAt(3), 16) & 0x3) | 0x8).toString(16)
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-7${rand.slice(0, 3)}-${variant}${rand.slice(4, 7)}-${rand.slice(7, 19)}`
}

// Media 1행이 R2에 남긴 객체 전체 (삭제용)
export const storedObjectsOf = ({ id, bucket, key, status }: MediaLocation): StoredObject[] => {
  if (status !== 'READY') return [{ bucket: 'PRIVATE', key }]
  if (bucket === 'PUBLIC') {
    return [
      { bucket, key },
      { bucket, key: publicThumbKey(id) },
    ]
  }
  return [{ bucket, key }]
}

// 상태와 무관하게 이 행이 R2에 남겼을 수 있는 객체 전체.
// PENDING·REJECTED는 complete가 최종 위치에 쓴 뒤 READY 전에 실패했을 수 있어 최종 키까지 지운다(없는 키 삭제는 무해)
export const allObjectsOf = (media: MediaLocation & { ownerId: string }): StoredObject[] => {
  if (media.status === 'READY') return storedObjectsOf(media)
  const finals: StoredObject[] =
    media.bucket === 'PUBLIC'
      ? [
          { bucket: 'PUBLIC', key: publicMainKey(media.id) },
          { bucket: 'PUBLIC', key: publicThumbKey(media.id) },
        ]
      : // 비공개는 용도(증명서·제보 사진)를 모르는 호출자도 있어 두 최종 위치를 모두 지운다
        [
          { bucket: 'PRIVATE', key: certificateKey(media.ownerId, media.id) },
          { bucket: 'PRIVATE', key: placeReportKey(media.ownerId, media.id) },
        ]
  return [{ bucket: 'PRIVATE', key: media.key }, ...finals]
}

// 공개 이미지 URL (커스텀 도메인). private·미완료면 null
export const publicUrlsOf = (
  publicBaseUrl: string,
  { id, bucket, key, status }: MediaLocation,
): { url: string | null; thumbUrl: string | null } => {
  if (status !== 'READY' || bucket !== 'PUBLIC') return { url: null, thumbUrl: null }
  return { url: `${publicBaseUrl}/${key}`, thumbUrl: `${publicBaseUrl}/${publicThumbKey(id)}` }
}
