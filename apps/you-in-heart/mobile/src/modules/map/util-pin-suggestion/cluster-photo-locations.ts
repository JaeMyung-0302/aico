import { toKstDate } from '@you-in-heart/shared'

// 같은 KST 날짜에 이 거리 안의 사진은 핀 제안 하나로 묶는다 (plan 2B.1)
export const SUGGESTION_RADIUS_M = 200
const EARTH_RADIUS_M = 6_371_000

type Coord = { lat: number; lng: number }

// 사진 한 장의 촬영 위치·시각 (기기 안에서만 쓰고 로그에 남기지 않는다)
export type PhotoLocation = Coord & { assetId: string; takenAtMs: number }

export type PhotoCluster = Coord & {
  // 날짜 + 첫 사진 id — 다중 선택 키
  key: string
  kstDate: string
  assetIds: string[]
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

// 두 좌표 사이 거리(하버사인, m)
export const distanceMeters = (a: Coord, b: Coord): number => {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

// 묶는 중의 상태: 기준점(첫 사진)과 담긴 사진들. 기준점과의 거리로 판단해 가운데가 끌려가지 않게 한다
type Group = { kstDate: string; anchor: PhotoLocation; members: readonly PhotoLocation[] }

const average = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

const toCluster = ({ kstDate, anchor, members }: Group): PhotoCluster => ({
  key: `${kstDate}:${anchor.assetId}`,
  kstDate,
  lat: average(members.map((member) => member.lat)),
  lng: average(members.map((member) => member.lng)),
  assetIds: members.map((member) => member.assetId),
})

const addTo = (groups: readonly Group[], photo: PhotoLocation): Group[] => {
  const kstDate = toKstDate(photo.takenAtMs)
  const index = groups.findIndex(
    (group) => group.kstDate === kstDate && distanceMeters(group.anchor, photo) <= SUGGESTION_RADIUS_M,
  )
  if (index < 0) return [...groups, { kstDate, anchor: photo, members: [photo] }]
  return groups.map((group, position) =>
    position === index ? { ...group, members: [...group.members, photo] } : group,
  )
}

// 일기 사진들의 촬영 위치 → 핀 제안 후보(촬영 시각 순). LOCATION 동의가 꺼져 있으면 0건
export const clusterPhotoLocations = (
  photos: readonly PhotoLocation[],
  { hasLocationConsent }: { hasLocationConsent: boolean },
): PhotoCluster[] => {
  if (!hasLocationConsent) return []
  return [...photos]
    .sort((a, b) => a.takenAtMs - b.takenAtMs)
    .reduce<Group[]>(addTo, [])
    .map(toCluster)
}
