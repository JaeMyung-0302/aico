import type { Place } from '@miri-pet/shared'

export const SEONGSU_BBOX = { swLat: 37.535, swLng: 127.045, neLat: 37.555, neLng: 127.068 }

export const makePlace = (overrides: Partial<Place> = {}): Place => ({
  id: '01890a5d-ac96-774b-bcce-b302099a8001',
  name: '숲길 테라스 카페',
  category: 'CAFE',
  address: '서울 성동구 성수동1가',
  lat: 37.5447,
  lng: 127.0565,
  allowedSizes: ['S', 'M', 'L'],
  indoorAllowed: true,
  conditionsNote: '대형견은 테라스만',
  source: 'PUBLIC_DATA',
  verifiedAt: '2026-10-02T00:00:00.000Z',
  ...overrides,
})
