import { haversineKm } from '@miri-pet/shared'
import { isGpsBuildEnabled } from '../util-location/gps-build-flag'
import { bboxAround, bboxCenter, DEFAULT_REGION, hasMovedAway, REGIONS } from '../util-regions'

describe('util-regions', () => {
  it('bboxAround: 중심을 감싸는 약 3km 정사각형', () => {
    const bbox = bboxAround(DEFAULT_REGION.center)
    expect(bboxCenter(bbox).lat).toBeCloseTo(DEFAULT_REGION.center.lat, 6)
    expect(bboxCenter(bbox).lng).toBeCloseTo(DEFAULT_REGION.center.lng, 6)
    const width = haversineKm({ lat: bbox.swLat, lng: bbox.swLng }, { lat: bbox.swLat, lng: bbox.neLng })
    const height = haversineKm({ lat: bbox.swLat, lng: bbox.swLng }, { lat: bbox.neLat, lng: bbox.swLng })
    expect(width).toBeCloseTo(3, 0)
    expect(height).toBeCloseTo(3, 0)
  })

  it('hasMovedAway: 범위의 15% 이하 이동은 무시, 넘으면 true', () => {
    const search = bboxAround(DEFAULT_REGION.center)
    const span = search.neLat - search.swLat
    const shift = (ratio: number) => ({
      ...search,
      swLat: search.swLat + span * ratio,
      neLat: search.neLat + span * ratio,
    })
    expect(hasMovedAway(search, search)).toBe(false)
    expect(hasMovedAway(search, shift(0.1))).toBe(false)
    expect(hasMovedAway(search, shift(0.3))).toBe(true)
    const lngSpan = search.neLng - search.swLng
    expect(hasMovedAway(search, { ...search, swLng: search.swLng - lngSpan, neLng: search.neLng - lngSpan })).toBe(true)
  })

  it('지역 프리셋 id는 유일하고 기본 지역은 성수동', () => {
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length)
    expect(DEFAULT_REGION.label).toBe('성수동')
  })

  it('GPS 빌드 플래그: EXPO_PUBLIC_FEATURE_GPS=true일 때만', () => {
    const original = process.env.EXPO_PUBLIC_FEATURE_GPS
    process.env.EXPO_PUBLIC_FEATURE_GPS = 'true'
    expect(isGpsBuildEnabled()).toBe(true)
    process.env.EXPO_PUBLIC_FEATURE_GPS = '1'
    expect(isGpsBuildEnabled()).toBe(false)
    if (original === undefined) delete process.env.EXPO_PUBLIC_FEATURE_GPS
    else process.env.EXPO_PUBLIC_FEATURE_GPS = original
  })
})
