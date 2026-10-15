import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useUpcomingVaccination } from '@/modules/vaccinations/data-access-vaccinations/useVaccinations'
import { dDayLabel, vaccineLabel } from '@/modules/vaccinations/util-vaccination/vaccination-dates'

const formatMonthDay = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${month}월 ${day}일`
}

// 04 홈 상단: 가장 가까운 다음 접종(Phase 2 GET /vaccinations/upcoming). 없으면 그리지 않는다
const VaccineDdayBanner = () => {
  const upcoming = useUpcomingVaccination()
  const item = upcoming.data?.item
  if (!item?.vaccination.nextDueOn) return null
  const title = `${item.pet.name} ${vaccineLabel(item.vaccination.type, item.vaccination.customName)} ${dDayLabel(item.dDay)}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, 내 펫에서 보기`}
      onPress={() => router.push('/pets')}
      style={styles.banner}
    >
      <View style={styles.icon}>
        <Icon name="calendar" size={20} />
      </View>
      <View style={styles.text}>
        <AppText variant="calloutStrong">{title}</AppText>
        <AppText variant="caption" color="ink2">
          {`${formatMonthDay(item.vaccination.nextDueOn)} · 증명서 미리 챙겨두세요`}
        </AppText>
      </View>
      <Icon name="chevronRight" size={18} color="ink2" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.warmSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md - 2,
    backgroundColor: COLORS.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: SPACING.xxs },
})

export default VaccineDdayBanner
