import type { PetSize, PlaceBboxQuery } from '@miri-pet/shared'

export type MapBbox = Pick<PlaceBboxQuery, 'swLat' | 'swLng' | 'neLat' | 'neLng'>
export type PlaceCategoryValue = NonNullable<PlaceBboxQuery['category']>
export type PlaceSort = NonNullable<PlaceBboxQuery['sort']>

export type PlaceFilterValue = {
  category: PlaceCategoryValue | null
  size: PetSize | null
  isIndoorOnly: boolean
}

export const EMPTY_PLACE_FILTERS: PlaceFilterValue = { category: null, size: null, isIndoorOnly: false }

// GET /places 쿼리. 기기 좌표가 아닌 지도 화면 bbox만 보낸다 (D4)
export const buildPlaceQueryParams = (
  bbox: MapBbox,
  filters: PlaceFilterValue,
  sort?: PlaceSort,
): Record<string, string | number> => ({
  ...bbox,
  ...(filters.category ? { category: filters.category } : {}),
  ...(filters.size ? { size: filters.size } : {}),
  ...(filters.isIndoorOnly ? { indoor: 'true' } : {}),
  ...(sort ? { sort } : {}),
})
