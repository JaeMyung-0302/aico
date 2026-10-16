import { BadRequestException } from '@nestjs/common'
import { haversineKm, type LatLng } from '@miri-pet/shared'

export { haversineKm }
export type Bbox = { swLat: number; swLng: number; neLat: number; neLng: number }

// 지도 화면 하나로 보기에 충분한 범위. 넘으면 전국 스캔이 되므로 막는다
export const MAX_BBOX_DIAGONAL_KM = 50

export const bboxCenter = ({ swLat, swLng, neLat, neLng }: Bbox): LatLng => ({
  lat: (swLat + neLat) / 2,
  lng: (swLng + neLng) / 2,
})

// 날짜변경선을 넘는 bbox는 국내 서비스에서 쓰지 않으므로 sw ≤ ne만 허용한다
export const assertValidBbox = (bbox: Bbox): void => {
  if (bbox.swLat > bbox.neLat || bbox.swLng > bbox.neLng) {
    throw new BadRequestException('지도 범위가 올바르지 않아요(sw가 ne보다 커요)')
  }
  const diagonal = haversineKm({ lat: bbox.swLat, lng: bbox.swLng }, { lat: bbox.neLat, lng: bbox.neLng })
  if (diagonal > MAX_BBOX_DIAGONAL_KM) {
    throw new BadRequestException('지도를 조금 더 확대해 주세요')
  }
}
