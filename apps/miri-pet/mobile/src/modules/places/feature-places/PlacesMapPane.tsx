import type { Place } from '@miri-pet/shared'
import type { Ref } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SCREEN_GUTTER, SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import PlaceRow from '../ui-place-list/PlaceRow'
import PlaceMap, { type PlaceMapHandle } from '../ui-place-map/PlaceMap'
import type { MapBbox } from '../util-place-query'

type PlacesMapPaneProps = {
  mapRef: Ref<PlaceMapHandle>
  places: readonly Place[]
  initialBbox: MapBbox
  selectedPlace: Place | null
  canSearchCameraArea: boolean
  isMyLocationAvailable: boolean
  onBboxIdle: (bbox: MapBbox) => void
  onSelectPlace: (placeId: string) => void
  onSearchCameraArea: () => void
  onPressMyLocation: () => void
  onOpenPlace: (placeId: string) => void
}

const PlacesMapPane = ({
  mapRef,
  places,
  initialBbox,
  selectedPlace,
  canSearchCameraArea,
  isMyLocationAvailable,
  onBboxIdle,
  onSelectPlace,
  onSearchCameraArea,
  onPressMyLocation,
  onOpenPlace,
}: PlacesMapPaneProps) => (
  <View style={styles.wrap}>
    <PlaceMap
      ref={mapRef}
      places={places}
      initialBbox={initialBbox}
      onBboxIdle={onBboxIdle}
      onSelectPlace={onSelectPlace}
    />
    {canSearchCameraArea ? (
      <Pressable accessibilityRole="button" onPress={onSearchCameraArea} style={styles.research}>
        <AppText variant="calloutStrong" color="primary">
          이 지역에서 다시 찾기
        </AppText>
      </Pressable>
    ) : null}
    {isMyLocationAvailable ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="내 위치"
        onPress={onPressMyLocation}
        style={styles.myLocation}
      >
        <Icon name="pin" color="primary" />
      </Pressable>
    ) : null}
    {selectedPlace ? (
      <View style={styles.card}>
        <PlaceRow place={selectedPlace} onPress={() => onOpenPlace(selectedPlace.id)} />
      </View>
    ) : null}
  </View>
)

const floating = {
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
} as const

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  research: {
    ...floating,
    position: 'absolute',
    top: SPACING.md,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  myLocation: {
    ...floating,
    position: 'absolute',
    right: SCREEN_GUTTER,
    bottom: SPACING.xxxl * 4,
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { position: 'absolute', left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom: SPACING.lg },
})

export default PlacesMapPane
