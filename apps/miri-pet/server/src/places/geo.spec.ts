import { BadRequestException } from '@nestjs/common'
import { assertValidBbox, bboxCenter, haversineKm, MAX_BBOX_DIAGONAL_KM } from './geo'

const CITY_HALL = { lat: 37.5663, lng: 126.9779 }
const GANGNAM_STATION = { lat: 37.4979, lng: 127.0276 }

describe('geo', () => {
  it('haversine: 서울시청 ↔ 강남역 약 8.9km (±0.2)', () => {
    expect(Math.abs(haversineKm(CITY_HALL, GANGNAM_STATION) - 8.9)).toBeLessThanOrEqual(0.2)
  })

  it('haversine: 같은 점은 0', () => {
    expect(haversineKm(CITY_HALL, CITY_HALL)).toBe(0)
  })

  it('bbox 중심', () => {
    expect(bboxCenter({ swLat: 37, swLng: 127, neLat: 38, neLng: 128 })).toEqual({ lat: 37.5, lng: 127.5 })
  })

  it('정상 bbox는 통과한다', () => {
    expect(() => assertValidBbox({ swLat: 37.54, swLng: 127.04, neLat: 37.55, neLng: 127.06 })).not.toThrow()
  })

  it('sw가 ne보다 크면(위도·경도 어느 쪽이든) 400', () => {
    expect(() => assertValidBbox({ swLat: 37.6, swLng: 127.0, neLat: 37.5, neLng: 127.1 })).toThrow(BadRequestException)
    expect(() => assertValidBbox({ swLat: 37.5, swLng: 127.1, neLat: 37.6, neLng: 127.0 })).toThrow(BadRequestException)
  })

  it(`대각선이 ${MAX_BBOX_DIAGONAL_KM}km를 넘으면 400 (서울 ↔ 대전)`, () => {
    expect(() => assertValidBbox({ swLat: 36.35, swLng: 127.38, neLat: 37.57, neLng: 126.98 + 1 })).toThrow(
      BadRequestException,
    )
    expect(() => assertValidBbox({ swLat: 37.4, swLng: 126.9, neLat: 37.7, neLng: 127.2 })).not.toThrow()
  })
})
