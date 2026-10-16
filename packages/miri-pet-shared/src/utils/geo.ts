export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

// 두 좌표 사이 대권 거리(km). 서버 거리순 정렬과 앱 목록의 거리 표시가 같은 식을 쓴다
export const haversineKm = (a: LatLng, b: LatLng): number => {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
