// ⚠️ @mj-studio/react-native-naver-map을 import하는 유일한 파일 (D9).
// react-native-maps로 바꿀 때는 이 파일만 교체한다 — 밖으로는 지도 SDK 타입을 노출하지 않는다
import type { LatLng, Place } from '@miri-pet/shared'
import { NaverMapView, type NaverMapViewRef, type Region } from '@mj-studio/react-native-naver-map'
import { type Ref, useImperativeHandle, useMemo, useRef } from 'react'
import { StyleSheet } from 'react-native'
import type { MapBbox } from '../util-place-query'

export type PlaceMapHandle = {
  moveTo: (center: LatLng) => void
  fitBbox: (bbox: MapBbox) => void
}

type PlaceMapProps = {
  ref?: Ref<PlaceMapHandle>
  places: readonly Place[]
  initialBbox: MapBbox
  // 카메라가 멈출 때마다 화면 bbox를 알린다
  onBboxIdle: (bbox: MapBbox) => void
  onSelectPlace: (placeId: string) => void
}

const MY_LOCATION_ZOOM = 15
const CLUSTER_SCREEN_DISTANCE = 60

// 이 라이브러리의 Region = south-west 꼭짓점 + 델타
const toRegion = ({ swLat, swLng, neLat, neLng }: MapBbox): Region => ({
  latitude: swLat,
  longitude: swLng,
  latitudeDelta: neLat - swLat,
  longitudeDelta: neLng - swLng,
})

const toBbox = ({ latitude, longitude, latitudeDelta, longitudeDelta }: Region): MapBbox => ({
  swLat: latitude,
  swLng: longitude,
  neLat: latitude + latitudeDelta,
  neLng: longitude + longitudeDelta,
})

const PlaceMap = ({ ref, places, initialBbox, onBboxIdle, onSelectPlace }: PlaceMapProps) => {
  const mapRef = useRef<NaverMapViewRef>(null)
  // initialRegion은 처음 한 번만 쓰인다 → 리렌더마다 새 객체를 만들지 않는다
  const initialRegion = useMemo(() => toRegion(initialBbox), [initialBbox])
  const clusters = useMemo(
    () => [
      {
        screenDistance: CLUSTER_SCREEN_DISTANCE,
        markers: places.map((place) => ({ identifier: place.id, latitude: place.lat, longitude: place.lng })),
      },
    ],
    [places],
  )

  useImperativeHandle(ref, () => ({
    moveTo: ({ lat, lng }) =>
      mapRef.current?.animateCameraTo({ latitude: lat, longitude: lng, zoom: MY_LOCATION_ZOOM }),
    fitBbox: (bbox) => mapRef.current?.animateRegionTo(toRegion(bbox)),
  }))

  return (
    <NaverMapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
      clusters={clusters}
      onCameraIdle={({ region }) => onBboxIdle(toBbox(region))}
      onTapClusterLeaf={({ markerIdentifier }) => onSelectPlace(markerIdentifier)}
    />
  )
}

const styles = StyleSheet.create({ map: { flex: 1 } })

export default PlaceMap
