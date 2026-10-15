import { randomUUID } from 'node:crypto'
import type { Place, Prisma, PrismaClient } from '../../src/generated/prisma'

// 성수동 일대 기준점과 이를 감싸는 bbox(약 2km)
export const SEONGSU = { lat: 37.5446, lng: 127.0559 }
export const SEONGSU_BBOX = { swLat: 37.535, swLng: 127.045, neLat: 37.555, neLng: 127.068 }

export const placeData = (overrides: Partial<Prisma.PlaceCreateManyInput> = {}): Prisma.PlaceCreateManyInput => ({
  name: '테스트 카페',
  category: 'CAFE',
  address: '서울 성동구 성수동',
  lat: SEONGSU.lat,
  lng: SEONGSU.lng,
  allowedSizes: ['S'],
  indoorAllowed: false,
  source: 'PUBLIC_DATA',
  sourceRef: `test-${randomUUID()}`,
  ...overrides,
})

export const createPlace = (
  prisma: PrismaClient,
  overrides: Partial<Prisma.PlaceCreateManyInput> = {},
): Promise<Place> => prisma.place.create({ data: placeData(overrides) })

export const bboxQuery = (bbox: typeof SEONGSU_BBOX = SEONGSU_BBOX): Record<string, number> => ({ ...bbox })
