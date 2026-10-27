import type { AnniversaryItem } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { toCountdownLabel } from '@/modules/anniversary/util-anniversary/anniversary-view'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'

// SCR-03 "다음 기념일 500일 · 2027. 01. 22  D-87 >" → SCR-04
const NextAnniversaryCard = ({ anniversary, nowMs }: { anniversary: AnniversaryItem; nowMs: number }) => {
  const summary = `${anniversary.title} · ${formatDotDate(anniversary.date)}`
  const countdown = toCountdownLabel(anniversary.date, nowMs)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`다음 기념일 ${summary} ${countdown}`}
      onPress={() => router.push('/anniversaries')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.texts}>
        <AppText variant="micro" color="ink3" style={styles.label}>
          다음 기념일
        </AppText>
        <AppText variant="bodyStrong" style={styles.summary}>
          {summary}
        </AppText>
      </View>
      <View style={styles.trailing}>
        <AppText variant="bodyStrong" color="accent">
          {countdown}
        </AppText>
        <Icon name="chevronRight" size={18} color="ink3" />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  pressed: { backgroundColor: COLORS.border },
  texts: { gap: 2, flexShrink: 1 },
  label: { fontSize: 12 },
  summary: { fontSize: 16 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})

export default NextAnniversaryCard
