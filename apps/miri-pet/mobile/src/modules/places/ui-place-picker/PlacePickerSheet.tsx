import type { Place, PostPlace } from '@miri-pet/shared'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Chip from '@/design-system/components/Chip'
import TextField from '@/design-system/components/TextField'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { usePlaces } from '../data-access-places/usePlaces'
import { categoryLabel } from '../util-place-format'
import { EMPTY_PLACE_FILTERS } from '../util-place-query'
import { bboxAround, DEFAULT_REGION, REGIONS } from '../util-regions'

type PlacePickerSheetProps = {
  isVisible: boolean
  onSelect: (place: PostPlace) => void
  onClose: () => void
}

const LIST_MAX_HEIGHT = 320

const matchesName = (place: Place, keyword: string) => place.name.toLowerCase().includes(keyword.toLowerCase())

// 06 장소 태그: 지역 프리셋 bbox의 장소(거리순)를 이름으로 걸러 1곳 고른다. 기기 위치는 쓰지 않는다(D4)
const PlacePickerSheet = ({ isVisible, onSelect, onClose }: PlacePickerSheetProps) => {
  const [regionId, setRegionId] = useState(DEFAULT_REGION.id)
  const [keyword, setKeyword] = useState('')
  const region = REGIONS.find((item) => item.id === regionId) ?? DEFAULT_REGION
  const places = usePlaces({ bbox: bboxAround(region.center), filters: EMPTY_PLACE_FILTERS, sort: 'distance' })
  const trimmed = keyword.trim()
  const items = (places.data?.items ?? []).filter((place) => !trimmed || matchesName(place, trimmed))

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <AppText variant="title3" accessibilityRole="header">
        장소 태그
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regions}>
        {REGIONS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            accessibilityLabel={item.label}
            isSelected={item.id === region.id}
            onPress={() => setRegionId(item.id)}
          />
        ))}
      </ScrollView>
      <TextField label="장소 이름 검색" value={keyword} onChangeText={setKeyword} placeholder="예: 카페 이름" />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {places.isPending ? <ActivityIndicator style={styles.state} color={COLORS.primary} /> : null}
        {places.isError ? (
          <AppText variant="callout" color="danger" style={styles.state}>
            장소를 불러오지 못했어요
          </AppText>
        ) : null}
        {places.isSuccess && items.length === 0 ? (
          <AppText variant="callout" color="ink2" style={styles.state}>
            이 지역에서 찾는 장소가 없어요
          </AppText>
        ) : null}
        {items.map((place) => (
          <Pressable
            key={place.id}
            accessibilityRole="button"
            accessibilityLabel={place.name}
            onPress={() => onSelect({ id: place.id, name: place.name, category: place.category })}
            style={styles.row}
          >
            <AppText variant="bodyStrong" numberOfLines={1}>
              {place.name}
            </AppText>
            <AppText variant="caption" color="ink2" numberOfLines={1}>
              {`${categoryLabel(place.category)} · ${place.address}`}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  regions: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  list: { maxHeight: LIST_MAX_HEIGHT, marginTop: SPACING.sm },
  state: { paddingVertical: SPACING.lg, textAlign: 'center' },
  row: {
    minHeight: 52,
    paddingVertical: SPACING.sm,
    gap: SPACING.xxs,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
})

export default PlacePickerSheet
