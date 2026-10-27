import { NaverMapView, type NaverMapViewRef } from '@mj-studio/react-native-naver-map'
import type { Place } from '@you-in-heart/shared'
import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet } from 'react-native'

// 네이버 지도 SDK 는 이 파일에서만 import 한다(plan 2B.1). SDK 를 바꾸면(S2 실패 시 react-native-maps) 여기만 바꾼다
export type MemoryMapProps = {
  places: readonly Place[]
  // 검색에서 막 남긴 곳처럼 카메라를 옮길 곳
  focus: { lat: number; lng: number } | null
  onPlacePress: (placeId: string) => void
}

// 서울시청 — 핀이 없을 때 처음 보이는 곳
const SEOUL = { latitude: 37.5666, longitude: 126.9784, zoom: 11 }
const FOCUS_ZOOM = 15
const MARKER_SIZE = 32

const initialRegionOf = (places: readonly Place[]) => {
  if (places.length === 0) return undefined
  const lats = places.map((place) => place.lat)
  const lngs = places.map((place) => place.lng)
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  return { latitude: minLat, longitude: minLng, latitudeDelta: maxLat - minLat, longitudeDelta: maxLng - minLng }
}

// SCR-10 지도: 가까운 핀은 SDK 클러스터로 묶고(숫자), 낱개 핀을 누르면 onPlacePress
const MemoryMap = ({ places, focus, onPlacePress }: MemoryMapProps) => {
  const ref = useRef<NaverMapViewRef>(null)
  const clusters = useMemo(
    () => [
      {
        markers: places.map((place) => ({
          identifier: place.id,
          latitude: place.lat,
          longitude: place.lng,
          width: MARKER_SIZE,
          height: MARKER_SIZE,
          image: { symbol: 'pink' as const },
        })),
      },
    ],
    [places],
  )

  useEffect(() => {
    if (focus) ref.current?.animateCameraTo({ latitude: focus.lat, longitude: focus.lng, zoom: FOCUS_ZOOM })
  }, [focus])

  return (
    <NaverMapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialCamera={places.length === 0 ? SEOUL : undefined}
      initialRegion={initialRegionOf(places)}
      isShowZoomControls={false}
      isShowLocationButton={false}
      locale="ko"
      clusters={clusters}
      onTapClusterLeaf={({ markerIdentifier }) => onPlacePress(markerIdentifier)}
    />
  )
}

export default MemoryMap
