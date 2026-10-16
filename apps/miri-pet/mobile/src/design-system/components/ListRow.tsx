import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'

type ListRowProps = {
  title: string
  subtitle?: string
  leading?: ReactNode
  trailing?: ReactNode
  onPress?: () => void
}

const ListRow = ({ title, subtitle, leading, trailing, onPress }: ListRowProps) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    disabled={!onPress}
    onPress={onPress}
    style={styles.row}
  >
    {leading}
    <View style={styles.body}>
      <AppText variant="bodyStrong">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color="ink2">
          {subtitle}
        </AppText>
      ) : null}
    </View>
    {trailing}
  </Pressable>
)

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  body: { flex: 1, gap: 2 },
})

export default ListRow
