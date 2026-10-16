import { haversineKm, type LatLng, type Place } from '@miri-pet/shared'
import { FlatList, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { SCREEN_GUTTER, SPACING } from '@/design-system/tokens/spacing'
import PlaceRow from './PlaceRow'

type PlaceListProps = {
  title: string
  places: readonly Place[]
  // 거리 표시 기준점 = 지도 중심(기기 위치 아님)
  center: LatLng
  onPressPlace: (placeId: string) => void
  onPressReportNew: () => void
}

const EmptyPlaces = ({ onPressReportNew }: Pick<PlaceListProps, 'onPressReportNew'>) => (
  <View style={styles.empty}>
    <AppText variant="bodyStrong">이 지역에 등록된 장소가 아직 없어요</AppText>
    <AppText variant="callout" color="ink2">
      아는 동반 가능 장소가 있다면 알려주세요
    </AppText>
    <Button label="새 장소 제보" variant="secondary" size="md" onPress={onPressReportNew} />
  </View>
)

const PlaceList = ({ title, places, center, onPressPlace, onPressReportNew }: PlaceListProps) => (
  <FlatList
    data={places}
    keyExtractor={(place) => place.id}
    style={styles.list}
    contentContainerStyle={styles.content}
    ListHeaderComponent={<AppText variant="title3">{title}</AppText>}
    ListEmptyComponent={<EmptyPlaces onPressReportNew={onPressReportNew} />}
    renderItem={({ item }) => (
      <PlaceRow place={item} distanceKm={haversineKm(center, item)} onPress={() => onPressPlace(item.id)} />
    )}
  />
)

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.ground },
  content: { padding: SCREEN_GUTTER, gap: SPACING.md },
  empty: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xxxl },
})

export default PlaceList
