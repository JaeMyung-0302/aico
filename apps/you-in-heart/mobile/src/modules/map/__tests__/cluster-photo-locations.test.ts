import {
  clusterPhotoLocations,
  distanceMeters,
  type PhotoLocation,
  SUGGESTION_RADIUS_M,
} from '../util-pin-suggestion/cluster-photo-locations'
import { suggestionName } from '../util-pin-suggestion/suggestion-name'

// 서울숲 근처 좌표. 위도 0.001도 ≈ 111m
const SEOUL_FOREST = { lat: 37.5444, lng: 127.0374 }
const at = (assetId: string, iso: string, dLat = 0, dLng = 0): PhotoLocation => ({
  assetId,
  lat: SEOUL_FOREST.lat + dLat,
  lng: SEOUL_FOREST.lng + dLng,
  takenAtMs: Date.parse(iso),
})

const ON = { hasLocationConsent: true }

describe('clusterPhotoLocations (핀 제안 묶기)', () => {
  it('같은 KST 날짜에 200m 안에 있는 사진은 제안 1개로 묶고, 가운데 좌표와 사진 수를 준다', () => {
    const photos = [
      at('a1', '2026-10-25T03:00:00.000Z'),
      at('a2', '2026-10-25T04:00:00.000Z', 0.001),
      at('a3', '2026-10-25T05:00:00.000Z', 0, 0.001),
    ]
    const clusters = clusterPhotoLocations(photos, ON)
    expect(SUGGESTION_RADIUS_M).toBe(200)
    expect(clusters).toHaveLength(1)
    expect(clusters[0]).toMatchObject({ kstDate: '2026-10-25', assetIds: ['a1', 'a2', 'a3'] })
    expect(clusters[0]?.lat).toBeCloseTo(SEOUL_FOREST.lat + 0.001 / 3, 6)
    expect(clusters[0]?.lng).toBeCloseTo(SEOUL_FOREST.lng + 0.001 / 3, 6)
  })

  it('같은 곳이라도 KST 날짜가 다르면 따로 제안한다 (UTC 가 아니라 한국 자정 기준)', () => {
    const photos = [at('night', '2026-10-25T14:59:00.000Z'), at('dawn', '2026-10-25T15:01:00.000Z')]
    const clusters = clusterPhotoLocations(photos, ON)
    expect(clusters.map((cluster) => cluster.kstDate)).toEqual(['2026-10-25', '2026-10-26'])
  })

  it('같은 날이라도 200m 를 넘게 떨어지면 따로 제안한다', () => {
    const near = at('a1', '2026-10-25T03:00:00.000Z')
    const far = at('a2', '2026-10-25T04:00:00.000Z', 0.0027)
    expect(distanceMeters(near, far)).toBeGreaterThan(SUGGESTION_RADIUS_M)
    expect(clusterPhotoLocations([near, far], ON)).toHaveLength(2)
  })

  it('LOCATION 동의가 꺼져 있으면 제안 0건', () => {
    const photos = [at('a1', '2026-10-25T03:00:00.000Z'), at('a2', '2026-10-25T04:00:00.000Z')]
    expect(clusterPhotoLocations(photos, { hasLocationConsent: false })).toEqual([])
  })

  it('사진이 없으면 빈 목록', () => {
    expect(clusterPhotoLocations([], ON)).toEqual([])
  })

  it('입력 배열을 바꾸지 않는다', () => {
    const photos = [at('b', '2026-10-26T03:00:00.000Z'), at('a', '2026-10-25T03:00:00.000Z')]
    const copy = [...photos]
    clusterPhotoLocations(photos, ON)
    expect(photos).toEqual(copy)
  })
})

describe('suggestionName (제안 이름)', () => {
  it('주소의 마지막 동네 이름에 "근처"를 붙인다 (지번·건물 번호는 뺀다)', () => {
    expect(suggestionName('서울 성동구 성수동1가 685-20')).toBe('성수동1가 근처')
    expect(suggestionName('서울 영등포구 여의동로 330')).toBe('여의동로 근처')
  })

  it('주소를 모르면 기본 이름', () => {
    expect(suggestionName(null)).toBe('사진 속 장소')
    expect(suggestionName('  ')).toBe('사진 속 장소')
  })
})
