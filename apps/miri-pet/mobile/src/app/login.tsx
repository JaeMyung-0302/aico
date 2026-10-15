import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLogin } from '@/modules/auth/data-access-auth/useLogin'
import DevLoginPanel from '@/modules/auth/feature-dev-login/DevLoginPanel'
import { isDevLoginEnabled } from '@/modules/auth/feature-dev-login/is-dev-login-enabled'
import BrandMark from '@/modules/auth/ui-brand-mark/BrandMark'
import SocialLoginButtons from '@/modules/auth/ui-social-login-buttons/SocialLoginButtons'
import { openLegalDocument } from '@/shared/config/open-legal-document'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'

// 시뮬레이터용 개발 로그인 (__DEV__ + EXPO_PUBLIC_ENABLE_DEV_LOGIN=true) — 운영 빌드에는 보이지 않는다
const IS_DEV_LOGIN_ENABLED = isDevLoginEnabled(__DEV__, process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN)

// 디자인 01 로그인 — 로그인 후 이동(동의/탭)은 인증 게이트가 맡는다
const LoginScreen = () => {
  const insets = useSafeAreaInsets()
  const toast = useTransientMessage()
  // 실패 안내(레이트 리밋 429 포함)는 토스트로 잠깐 보여준다
  const { login, pendingProvider } = useLogin({ onError: toast.show })

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.xxxl }]}>
      <View style={styles.hero}>
        <BrandMark />
        <AppText variant="display" accessibilityRole="header">
          미리펫
        </AppText>
        <AppText variant="body" color="ink2" style={styles.tagline}>
          {'접종 기록은 미리 챙기고\n함께 갈 곳은 미리 찾고\n우리 아이 자랑은 마음껏'}
        </AppText>
      </View>

      <View style={styles.actions}>
        <SocialLoginButtons pendingProvider={pendingProvider} onSelectProvider={login} />
        {IS_DEV_LOGIN_ENABLED ? <DevLoginPanel /> : null}
        <AppText variant="caption" color="ink3" style={[styles.center, styles.terms]}>
          {'계속하면 '}
          <AppText
            variant="caption"
            color="primary"
            accessibilityRole="link"
            onPress={() => openLegalDocument('terms')}
          >
            이용약관
          </AppText>
          {' 및 '}
          <AppText
            variant="caption"
            color="primary"
            accessibilityRole="link"
            onPress={() => openLegalDocument('privacy')}
          >
            개인정보 처리방침
          </AppText>
          {'을\n확인한 것으로 간주합니다.'}
        </AppText>
      </View>
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: SPACING.xxl, backgroundColor: COLORS.surface },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  tagline: { fontSize: 16, lineHeight: 26, textAlign: 'center' },
  actions: { gap: SPACING.sm + 2 },
  center: { textAlign: 'center' },
  terms: { marginTop: SPACING.sm + 2, lineHeight: 19 },
})

export default LoginScreen
