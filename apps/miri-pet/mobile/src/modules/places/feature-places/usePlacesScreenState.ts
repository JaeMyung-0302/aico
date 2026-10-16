import { useState } from 'react'
import { usePlaces } from '../data-access-places/usePlaces'
import { EMPTY_PLACE_FILTERS, type MapBbox, type PlaceFilterValue } from '../util-place-query'
import { bboxAround, DEFAULT_REGION, hasMovedAway, type Region } from '../util-regions'

export type PlacesMode = 'map' | 'list'
type SearchArea = { label: string; bbox: MapBbox }

const MAP_AREA_LABEL = '지도 중심'

// 장소 탭 상태: 검색 범위(지역 프리셋 또는 지도 화면), 필터, 지도/목록 모드
export const usePlacesScreenState = () => {
  const [mode, setMode] = useState<PlacesMode>('map')
  const [filters, setFilters] = useState<PlaceFilterValue>(EMPTY_PLACE_FILTERS)
  const [search, setSearch] = useState<SearchArea>(() => ({
    label: DEFAULT_REGION.label,
    bbox: bboxAround(DEFAULT_REGION.center),
  }))
  const [cameraBbox, setCameraBbox] = useState<MapBbox | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  // 목록은 지도 중심에서 가까운 순(서버 정렬). 지도는 정렬이 필요 없다
  const placesQuery = usePlaces({ bbox: search.bbox, filters, ...(mode === 'list' ? { sort: 'distance' } : {}) })
  const places = placesQuery.data?.items ?? []

  const selectRegion = (region: Region): MapBbox => {
    const bbox = bboxAround(region.center)
    setSearch({ label: region.label, bbox })
    setCameraBbox(null)
    setSelectedPlaceId(null)
    return bbox
  }

  const searchCameraArea = () => {
    if (!cameraBbox) return
    setSearch({ label: MAP_AREA_LABEL, bbox: cameraBbox })
    setSelectedPlaceId(null)
  }

  return {
    mode,
    toggleMode: () => setMode((prev) => (prev === 'map' ? 'list' : 'map')),
    filters,
    setFilters,
    search,
    selectRegion,
    setCameraBbox,
    canSearchCameraArea: cameraBbox !== null && hasMovedAway(search.bbox, cameraBbox),
    searchCameraArea,
    placesQuery,
    places,
    selectedPlace: places.find((place) => place.id === selectedPlaceId) ?? null,
    setSelectedPlaceId,
  }
}
