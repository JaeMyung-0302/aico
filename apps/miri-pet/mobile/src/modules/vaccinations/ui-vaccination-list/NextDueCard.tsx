import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import type { NextDue } from '../util-vaccination/next-due'
import { dDayLabel, formatDotDate, vaccineLabel } from '../util-vaccination/vaccination-dates'

// 디자인 14 다음 접종 카드: D-7 / 다음 접종 · 이름 / 날짜 · 알림 안내
const NextDueCard = ({ next }: { next: NextDue }) => (
  <View style={styles.card}>
    <AppText variant="title2" color="onWarmSoft">
      {dDayLabel(next.dDay)}
    </AppText>
    <View style={styles.body}>
      <AppText variant="bodyStrong">
        {`다음 접종 · ${vaccineLabel(next.vaccination.type, next.vaccination.customName)}`}
      </AppText>
      <AppText variant="caption" color="ink2">
        {`${formatDotDate(next.vaccination.nextDueOn ?? '')} · 7일 전, 하루 전에 알려드려요`}
      </AppText>
    </View>
  </View>
)

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.warmSoft,
  },
  body: { flex: 1, gap: SPACING.xxs },
})

export default NextDueCard
