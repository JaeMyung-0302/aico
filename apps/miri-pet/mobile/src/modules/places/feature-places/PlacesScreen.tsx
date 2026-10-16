import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { SCREEN_GUTTER, SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import PlaceFilters from '../ui-place-filters/PlaceFilters'
import PlaceList from '../ui-place-list/PlaceList'
import type { PlaceMapHandle } from '../ui-place-map/PlaceMap'
import { useMyLocation } from '../util-location/useMyLocation'
import { bboxCenter, type Region } from '../util-regions'
import PlacesMapPane from './PlacesMapPane'
import RegionSheet from './RegionSheet'
import { usePlacesScreenState } from './usePlacesScreenState'

const LOCATE_MESSAGES = {
  denied: '위치 권한이 없어 지역 선택으로 찾아볼 수 있어요',
  error: '현재 위치를 가져오지 못했어요',
} as const

const openPlace = (placeId: string) => router.push({ pathname: '/places/[placeId]', params: { placeId } })

// 08 지도 / 09 목록. 위치 권한 없이도 지역 선택·지도 이동으로 동작한다 (US-005)
const PlacesScreen = () => {
  const insets = useSafeAreaInsets()
  const state = usePlacesScreenState()
  const mapRef = useRef<PlaceMapHandle>(null)
  const [isRegionSheetVisible, setIsRegionSheetVisible] = useState(false)
  const toast = useTransientMessage()
  const myLocation = useMyLocation()
  const center = bboxCenter(state.search.bbox)

  const handleRegionSelect = (region: Region) => {
    setIsRegionSheetVisible(false)
    mapRef.current?.fitBbox(state.selectRegion(region))
  }

  const handleMyLocationPress = async () => {
    const result = await myLocation.locate()
    if (result.kind === 'ok') mapRef.current?.moveTo(result.coords)
    else toast.show(LOCATE_MESSAGES[result.kind])
  }

  const handleReportNewPress = () =>
    router.push({ pathname: '/places/report', params: { lat: String(center.lat), lng: String(center.lng) } })

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${state.search.label} 주변 · 지역 바꾸기`}
          onPress={() => setIsRegionSheetVisible(true)}
          style={styles.region}
        >
          <Icon name="pin" color="primary" size={20} />
          <AppText variant="title3">{`${state.search.label} 주변`}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.mode === 'map' ? '목록으로 보기' : '지도로 보기'}
          onPress={state.toggleMode}
          style={styles.toggle}
        >
          <AppText variant="calloutStrong" color="primary">
            {state.mode === 'map' ? '목록' : '지도'}
          </AppText>
        </Pressable>
      </View>
      <PlaceFilters value={state.filters} onChange={state.setFilters} />
      {state.placesQuery.data?.isTruncated ? (
        <AppText variant="caption" color="onWarmSoft" style={styles.notice}>
          장소가 많아 일부만 보여요. 지도를 확대해 주세요
        </AppText>
      ) : null}
      {state.placesQuery.isError ? (
        <View style={styles.error}>
          <AppText variant="callout" color="danger">
            장소를 불러오지 못했어요
          </AppText>
          <Button label="다시 시도" variant="secondary" size="md" onPress={() => state.placesQuery.refetch()} />
        </View>
      ) : null}
      {state.mode === 'map' ? (
        <PlacesMapPane
          mapRef={mapRef}
          places={state.places}
          initialBbox={state.search.bbox}
          selectedPlace={state.selectedPlace}
          canSearchCameraArea={state.canSearchCameraArea}
          isMyLocationAvailable={myLocation.isAvailable}
          onBboxIdle={state.setCameraBbox}
          onSelectPlace={state.setSelectedPlaceId}
          onSearchCameraArea={state.searchCameraArea}
          onPressMyLocation={handleMyLocationPress}
          onOpenPlace={openPlace}
        />
      ) : (
        <PlaceList
          title={`${state.search.label} 주변 ${state.places.length}곳`}
          places={state.places}
          center={center}
          onPressPlace={openPlace}
          onPressReportNew={handleReportNewPress}
        />
      )}
      <RegionSheet
        isVisible={isRegionSheetVisible}
        currentLabel={state.search.label}
        onClose={() => setIsRegionSheetVisible(false)}
        onSelect={handleRegionSelect}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_GUTTER,
    minHeight: TOUCH_TARGET + SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  region: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: TOUCH_TARGET },
  toggle: { minHeight: TOUCH_TARGET, minWidth: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  notice: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.xs, backgroundColor: COLORS.warmSoft },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_GUTTER,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.dangerSoft,
  },
})

export default PlacesScreen
