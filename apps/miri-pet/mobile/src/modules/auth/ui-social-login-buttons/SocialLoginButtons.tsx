import type { AuthProvider } from '@miri-pet/shared'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import AppText from '@/design-system/components/AppText'
import { COLORS, GOOGLE_LOGO_COLORS, type ColorToken } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type SocialLoginButtonsProps = {
  // 진행 중인 제공자 (null = 대기)
  pendingProvider: AuthProvider | null
  onSelectProvider: (provider: AuthProvider) => void
}

const KAKAO_BUBBLE =
  'M12 3.5C6.8 3.5 2.6 6.8 2.6 10.9c0 2.6 1.7 4.9 4.4 6.2l-1 3.8c-.1.3.3.6.6.4l4.4-2.9c.3 0 .7.1 1 .1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.5 12 3.5z'

const KakaoLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
    <Path d={KAKAO_BUBBLE} fill={COLORS.onKakao} />
  </Svg>
)

const GoogleLogo = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
    <Path
      fill={GOOGLE_LOGO_COLORS.blue}
      d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
    />
    <Path
      fill={GOOGLE_LOGO_COLORS.green}
      d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
    />
    <Path fill={GOOGLE_LOGO_COLORS.yellow} d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
    <Path
      fill={GOOGLE_LOGO_COLORS.red}
      d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.7 9.4 5.9 12 5.9z"
    />
  </Svg>
)

// v1 로그인 버튼: iOS·Android 모두 카카오 + Google (Apple 없음 — 사용자 결정)
const PROVIDERS: readonly {
  provider: AuthProvider
  label: string
  text: ColorToken
  Logo: () => React.JSX.Element
  variant: 'kakao' | 'google'
}[] = [
  { provider: 'KAKAO', label: '카카오로 시작하기', text: 'onKakao', Logo: KakaoLogo, variant: 'kakao' },
  { provider: 'GOOGLE', label: 'Google로 계속하기', text: 'ink', Logo: GoogleLogo, variant: 'google' },
]

const SocialLoginButtons = ({ pendingProvider, onSelectProvider }: SocialLoginButtonsProps) => {
  const isPending = pendingProvider !== null
  return (
    <View style={styles.wrap}>
      {PROVIDERS.map(({ provider, label, text, Logo, variant }) => {
        const isBusy = pendingProvider === provider
        return (
          <Pressable
            key={provider}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: isPending, busy: isBusy }}
            disabled={isPending}
            onPress={() => onSelectProvider(provider)}
            style={({ pressed }) => [
              styles.button,
              styles[variant],
              (pressed || (isPending && !isBusy)) && styles.dimmed,
            ]}
          >
            {isBusy ? <ActivityIndicator color={COLORS[text]} /> : <Logo />}
            <AppText variant="button" color={text}>
              {label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm + 2 },
  button: {
    height: 54,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm + 2,
  },
  kakao: { backgroundColor: COLORS.kakao },
  google: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong },
  dimmed: { opacity: 0.6 },
})

export default SocialLoginButtons
