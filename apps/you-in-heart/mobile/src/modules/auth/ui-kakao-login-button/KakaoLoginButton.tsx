import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { KAKAO_COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'

type KakaoLoginButtonProps = {
  label: string
  isPending: boolean
  onPress: () => void
}

const KAKAO_BUBBLE =
  'M12 4C6.9 4 3 7.2 3 11.1c0 2.5 1.6 4.6 4.1 5.9l-.9 3.4c-.1.3.3.5.5.3l4-2.7c.4 0 .9.1 1.3.1 5.1 0 9-3.2 9-7.1S17.1 4 12 4z'

// SCR-01 카카오 버튼 (카카오 디자인 가이드: 노란 바탕 + 검정 말풍선, 모서리 12)
const KakaoLoginButton = ({ label, isPending, onPress }: KakaoLoginButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: isPending, busy: isPending }}
    disabled={isPending}
    onPress={onPress}
    style={({ pressed }) => [styles.button, (pressed || isPending) && styles.dimmed]}
  >
    {isPending ? (
      <ActivityIndicator color={KAKAO_COLORS.symbol} />
    ) : (
      <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
        <Path d={KAKAO_BUBBLE} fill={KAKAO_COLORS.symbol} />
      </Svg>
    )}
    <Text style={styles.label}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  button: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: KAKAO_COLORS.container,
  },
  dimmed: { opacity: 0.7 },
  label: { ...TYPOGRAPHY.button, color: KAKAO_COLORS.label },
})

export default KakaoLoginButton
