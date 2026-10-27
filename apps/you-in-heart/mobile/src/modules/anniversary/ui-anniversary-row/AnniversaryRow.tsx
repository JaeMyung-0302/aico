import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS, type ColorToken } from '@/design-system/tokens/colors'
import { FONT_FAMILY } from '@/design-system/tokens/typography'

type AnniversaryRowProps = {
  title: string
  dateLabel: string
  // 오른쪽 "D-87". 지난 기념일은 없다
  countdown?: string
  isHighlighted?: boolean
  isPast?: boolean
  isLast?: boolean
  // 우리가 정한 날만 눌러서 고친다
  onPress?: () => void
}

// SCR-04 목록 행: 64px, 아래 테두리, 왼쪽 이름(16 medium)·날짜(13), 오른쪽 D-n(15 bold, 가장 가까운 것은 포인트 색)
const AnniversaryRow = ({
  title,
  dateLabel,
  countdown,
  isHighlighted = false,
  isPast = false,
  isLast = false,
  onPress,
}: AnniversaryRowProps) => {
  const titleColor: ColorToken = isPast ? 'ink2' : 'ink'
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${title} 수정` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, isLast && styles.last, pressed && styles.pressed]}
    >
      <View style={styles.texts}>
        <AppText color={titleColor} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" color="ink3">
          {dateLabel}
        </AppText>
      </View>
      {countdown ? (
        <AppText variant="bodyStrong" color={isHighlighted ? 'accent' : 'ink'}>
          {countdown}
        </AppText>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  last: { borderBottomWidth: 0 },
  pressed: { backgroundColor: COLORS.surface },
  texts: { gap: 2, flexShrink: 1 },
  title: { fontSize: 16, fontFamily: FONT_FAMILY.medium },
})

export default AnniversaryRow
