import { useQuery } from '@tanstack/react-query'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { countAssetsInRange } from '@/modules/media/util-pick-assets/list-assets-by-date-range'
import type { RangeOption, RangeOptionId } from './range-options'

type RangeOptionListProps = {
  options: readonly RangeOption[]
  selectedId: RangeOptionId
  onSelect: (option: RangeOption) => void
}

// 옵션 옆 장수(보관함 totalCount). 분 단위로 같은 기간을 다시 세지 않는다
const useAssetCount = (option: RangeOption) =>
  useQuery({
    queryKey: ['media-library', 'count', option.range?.fromMs, Math.floor((option.range?.toMs ?? 0) / 60_000)],
    queryFn: () => (option.range ? countAssetsInRange(option.range) : Promise.resolve(0)),
    enabled: option.range !== null,
    gcTime: 0,
  })

const OptionRow = ({ option, isSelected, onPress }: { option: RangeOption; isSelected: boolean; onPress: () => void }) => {
  const count = useAssetCount(option)
  const countLabel = count.data !== undefined ? `${count.data.toLocaleString('ko-KR')}장` : null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={countLabel ? `${option.label} ${countLabel}` : option.label}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.option, isSelected ? styles.optionOn : null]}
    >
      <AppText>{option.label}</AppText>
      {countLabel ? (
        <AppText variant={isSelected ? 'captionStrong' : 'caption'} color={isSelected ? 'accentPressed' : 'ink3'}>
          {countLabel}
        </AppText>
      ) : option.id === 'custom' ? (
        <Icon name="chevronRight" size={16} color="ink3" />
      ) : null}
    </Pressable>
  )
}

// SCR-08 기간 선택(고른 옵션: 로즈 테두리 + blush 바탕)
const RangeOptionList = ({ options, selectedId, onSelect }: RangeOptionListProps) => (
  <View style={styles.list}>
    {options.map((option) => (
      <OptionRow key={option.id} option={option} isSelected={option.id === selectedId} onPress={() => onSelect(option)} />
    ))}
  </View>
)

const styles = StyleSheet.create({
  list: { gap: SPACING[2] },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionOn: { borderColor: COLORS.accent, backgroundColor: COLORS.blush },
})

export default RangeOptionList
