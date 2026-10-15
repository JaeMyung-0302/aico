import { Pressable, StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'
import Icon from './Icon'

type CheckboxProps = {
  label: string
  isChecked: boolean
  onToggle: () => void
  // 'emphasis' = 전체 동의처럼 굵고 큰 행
  variant?: 'default' | 'emphasis'
}

const Checkbox = ({ label, isChecked, onToggle, variant = 'default' }: CheckboxProps) => {
  const isEmphasis = variant === 'emphasis'
  const boxSize = isEmphasis ? 22 : 20
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      onPress={onToggle}
      style={[styles.row, isEmphasis ? styles.emphasisRow : null]}
    >
      <View style={[styles.box, { width: boxSize, height: boxSize }, isChecked ? styles.boxChecked : styles.boxIdle]}>
        {isChecked ? <Icon name="check" size={boxSize - 6} color="surface" /> : null}
      </View>
      <AppText variant={isEmphasis ? 'title3' : 'body'} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  emphasisRow: { minHeight: 60 },
  box: { borderRadius: RADIUS.sm - 2, alignItems: 'center', justifyContent: 'center' },
  boxIdle: { borderWidth: 1.5, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface },
  boxChecked: { backgroundColor: COLORS.primary },
  label: { flex: 1 },
})

export default Checkbox
