import { Pressable, StyleSheet, type PressableProps } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import AppText from './AppText'

type ChipProps = Omit<PressableProps, 'children'> & {
  label: string
  isSelected?: boolean
}

const Chip = ({ label, isSelected = false, style, ...rest }: ChipProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: isSelected }}
    style={(state) => [
      styles.base,
      isSelected ? styles.selected : styles.idle,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...rest}
  >
    <AppText variant="calloutStrong" color={isSelected ? 'onPrimarySoft' : 'ink'}>
      {label}
    </AppText>
  </Pressable>
)

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: { borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface },
  selected: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
})

export default Chip
