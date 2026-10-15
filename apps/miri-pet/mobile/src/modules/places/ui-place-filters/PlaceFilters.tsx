import type { PetSize } from '@miri-pet/shared'
import { ScrollView, StyleSheet, View } from 'react-native'
import Chip from '@/design-system/components/Chip'
import { COLORS } from '@/design-system/tokens/colors'
import { SCREEN_GUTTER, SPACING } from '@/design-system/tokens/spacing'
import { categoryLabel, SIZE_LABELS } from '../util-place-format'
import type { PlaceCategoryValue, PlaceFilterValue } from '../util-place-query'

type PlaceFiltersProps = {
  value: PlaceFilterValue
  onChange: (next: PlaceFilterValue) => void
}

const CATEGORIES: readonly PlaceCategoryValue[] = ['CAFE', 'RESTAURANT', 'PARK', 'ACCOMMODATION', 'HOSPITAL']
const SIZES: readonly PetSize[] = ['S', 'M', 'L']

// 업종·크기는 하나만(다시 누르면 해제), 실내 동반은 켜고 끄기
const PlaceFilters = ({ value, onChange }: PlaceFiltersProps) => (
  <View style={styles.wrap}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          label={categoryLabel(category)}
          isSelected={value.category === category}
          onPress={() => onChange({ ...value, category: value.category === category ? null : category })}
        />
      ))}
      <View style={styles.divider} />
      {SIZES.map((size) => (
        <Chip
          key={size}
          label={SIZE_LABELS[size]}
          isSelected={value.size === size}
          onPress={() => onChange({ ...value, size: value.size === size ? null : size })}
        />
      ))}
      <Chip
        label="실내 동반"
        isSelected={value.isIndoorOnly}
        onPress={() => onChange({ ...value, isIndoorOnly: !value.isIndoorOnly })}
      />
    </ScrollView>
  </View>
)

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  row: { gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.sm, alignItems: 'center' },
  divider: { width: 1, height: 20, backgroundColor: COLORS.border },
})

export default PlaceFilters
