import type { Vaccination } from '@miri-pet/shared'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { formatDotDate, vaccineLabel } from '../util-vaccination/vaccination-dates'

type VaccinationListProps = {
  vaccinations: readonly Vaccination[]
  onPressCertificate: (vaccination: Vaccination) => void
  // 기록(이름·날짜)을 누르면 수정 화면
  onPressVaccination: (vaccination: Vaccination) => void
}

const metaLine = (vaccination: Vaccination): string =>
  [formatDotDate(vaccination.administeredOn), vaccination.clinicName].filter(Boolean).join(' · ')

// 디자인 14 "접종 기록" 목록: 이름 / 날짜 · 병원(누르면 수정) / 증명서 배지
const VaccinationList = ({ vaccinations, onPressCertificate, onPressVaccination }: VaccinationListProps) => {
  if (vaccinations.length === 0) {
    return (
      <AppText variant="callout" color="ink3" style={styles.empty}>
        아직 접종 기록이 없어요
      </AppText>
    )
  }
  return (
    <View style={styles.list}>
      {vaccinations.map((vaccination) => {
        const label = vaccineLabel(vaccination.type, vaccination.customName)
        return (
          <View key={vaccination.id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label} 기록 수정`}
              onPress={() => onPressVaccination(vaccination)}
              style={styles.body}
            >
              <AppText variant="bodyStrong">{label}</AppText>
              <AppText variant="caption" color="ink2">
                {metaLine(vaccination)}
              </AppText>
            </Pressable>
            {vaccination.certificateCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label} 증명서 보기`}
                onPress={() => onPressCertificate(vaccination)}
                style={styles.badge}
              >
                <AppText variant="captionStrong" color="onPrimarySoft">
                  증명서
                </AppText>
              </Pressable>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderRadius: RADIUS.xl, backgroundColor: COLORS.surface, overflow: 'hidden' },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  body: { flex: 1, gap: SPACING.xxs },
  badge: {
    minHeight: 32,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  empty: { paddingVertical: SPACING.xl, textAlign: 'center' },
})

export default VaccinationList
