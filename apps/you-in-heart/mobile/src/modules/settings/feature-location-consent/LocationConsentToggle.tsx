import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Toggle from '@/design-system/components/Toggle'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLocationConsent } from './useLocationConsent'

const LABEL = '사진 위치 사용'

// SCR-16 "사진 위치 사용" — 켜면 사진 좌표를 보내고 추억 지도·핀 제안을 연다. 끄면 이후 사진의 좌표는 보내지 않는다
// (ListRow 는 누를 수 없는 행이면 Pressable 을 비활성으로 두어 안의 스위치까지 막는다 → 같은 모양의 행을 따로 그린다)
const LocationConsentToggle = () => {
  const consent = useLocationConsent()
  return (
    <View>
      <View style={styles.row}>
        <AppText style={styles.title}>{LABEL}</AppText>
        <Toggle
          label={LABEL}
          isOn={consent.isOn}
          isDisabled={!consent.isKnown || consent.isPending}
          onChange={consent.setLocation}
        />
      </View>
      {consent.isError ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert" style={styles.error}>
          바꾸지 못했어요. 잠시 후 다시 시도해 주세요
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  // ListRow 와 같은 52px·좌우 24
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[3],
    paddingHorizontal: SPACING.screen,
    backgroundColor: COLORS.bg,
  },
  title: { flexShrink: 1 },
  error: { paddingHorizontal: SPACING.screen },
})

export default LocationConsentToggle
