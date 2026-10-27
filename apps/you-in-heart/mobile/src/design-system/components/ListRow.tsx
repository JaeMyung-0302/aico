import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { COLORS, type ColorToken } from '../tokens/colors'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'
import Icon from './Icon'

type ListRowProps = {
  title: string
  value?: string
  titleColor?: ColorToken
  // null 이면 화살표 없이(로그아웃처럼 바로 실행되는 행)
  trailing?: ReactNode
  onPress?: () => void
  isDisabled?: boolean
}

// SCR-16 설정 행: 52px, 좌우 24, 오른쪽에 값 + 화살표
const ListRow = ({ title, value, titleColor = 'ink', trailing, onPress, isDisabled = false }: ListRowProps) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={value ? `${title} ${value}` : title}
    accessibilityState={onPress ? { disabled: isDisabled } : undefined}
    disabled={!onPress || isDisabled}
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
  >
    <AppText color={titleColor} style={styles.title}>
      {title}
    </AppText>
    <View style={styles.trailing}>
      {value ? (
        <AppText variant="label" color="ink3">
          {value}
        </AppText>
      ) : null}
      {trailing}
      {onPress && trailing === undefined ? <Icon name="chevronRight" size={16} color="ink3" /> : null}
    </View>
  </Pressable>
)

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[3],
    paddingHorizontal: SPACING.screen,
    backgroundColor: COLORS.bg,
  },
  pressed: { backgroundColor: COLORS.surface },
  title: { flexShrink: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
})

export default ListRow
