import { Pressable, StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type SizeOptionProps = { label: string; hint: string; isSelected: boolean; onPress: () => void }

// 디자인 03 크기 선택: 2줄(소형 / ~10kg) 큰 칩
const SizeOption = ({ label, hint, isSelected, onPress }: SizeOptionProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${label} ${hint}`}
    accessibilityState={{ selected: isSelected }}
    onPress={onPress}
    style={[styles.base, isSelected ? styles.selected : styles.idle]}
  >
    <AppText variant="calloutStrong" color={isSelected ? 'onPrimarySoft' : 'ink'}>
      {label}
    </AppText>
    <AppText variant="caption" color={isSelected ? 'onPrimarySoft' : 'ink3'}>
      {hint}
    </AppText>
  </Pressable>
)

const styles = StyleSheet.create({
  base: { flex: 1, height: 60, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: SPACING.xxs },
  idle: { borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface },
  selected: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
})

export default SizeOption
