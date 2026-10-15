import type { LatLng } from '@miri-pet/shared'
import type { MapBbox } from './util-place-query'

export type Region = { id: string; label: string; center: LatLng }

// 위치 권한 없이 찾을 수 있도록 고른 지역 프리셋(지도 이동과 함께 쓴다)
const SEONGSU: Region = { id: 'seongsu', label: '성수동', center: { lat: 37.5446, lng: 127.0559 } }

export const REGIONS: readonly Region[] = [
  SEONGSU,
  { id: 'yeonnam', label: '연남동', center: { lat: 37.5622, lng: 126.9254 } },
  { id: 'hongdae', label: '홍대입구', center: { lat: 37.5571, lng: 126.9245 } },
  { id: 'gangnam', label: '강남역', center: { lat: 37.4979, lng: 127.0276 } },
  { id: 'jamsil', label: '잠실', center: { lat: 37.5133, lng: 127.1001 } },
  { id: 'pangyo', label: '판교', center: { lat: 37.3948, lng: 127.1112 } },
  { id: 'haeundae', label: '해운대', center: { lat: 35.1587, lng: 129.1604 } },
]

export const DEFAULT_REGION = SEONGSU

const KM_PER_LAT_DEGREE = 111
const DEFAULT_SPAN_KM = 3

// 중심에서 가로·세로 spanKm 크기의 bbox
export const bboxAround = ({ lat, lng }: LatLng, spanKm = DEFAULT_SPAN_KM): MapBbox => {
  const latHalf = spanKm / 2 / KM_PER_LAT_DEGREE
  const lngHalf = spanKm / 2 / (KM_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180))
  return { swLat: lat - latHalf, swLng: lng - lngHalf, neLat: lat + latHalf, neLng: lng + lngHalf }
}

export const bboxCenter = ({ swLat, swLng, neLat, neLng }: MapBbox): LatLng => ({
  lat: (swLat + neLat) / 2,
  lng: (swLng + neLng) / 2,
})

const MOVE_TOLERANCE_RATIO = 0.15

// 지도 카메라가 검색 범위에서 의미 있게(가로·세로의 15% 이상) 움직였는지
export const hasMovedAway = (search: MapBbox, current: MapBbox): boolean => {
  const latSpan = search.neLat - search.swLat
  const lngSpan = search.neLng - search.swLng
  const latDiff = Math.max(Math.abs(search.swLat - current.swLat), Math.abs(search.neLat - current.neLat))
  const lngDiff = Math.max(Math.abs(search.swLng - current.swLng), Math.abs(search.neLng - current.neLng))
  return latDiff > latSpan * MOVE_TOLERANCE_RATIO || lngDiff > lngSpan * MOVE_TOLERANCE_RATIO
}
