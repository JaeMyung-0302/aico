import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLogin } from '../data-access-auth/useLogin'
import DevLoginPanel from '../feature-dev-login/DevLoginPanel'
import { isDevLoginEnabled } from '../feature-dev-login/is-dev-login-enabled'
import KakaoLoginButton from '../ui-kakao-login-button/KakaoLoginButton'

// 시뮬레이터용 개발 로그인 (__DEV__ + EXPO_PUBLIC_ENABLE_DEV_LOGIN=true) — 운영 빌드에는 보이지 않는다
const IS_DEV_LOGIN_ENABLED = isDevLoginEnabled(__DEV__, process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN)

const LoginErrorAlert = ({ message }: { message: string }) => (
  <View accessibilityRole="alert" style={styles.alert}>
    <Icon name="alert" size={20} color="danger" />
    <View style={styles.alertText}>
      <AppText variant="labelStrong">로그인하지 못했어요</AppText>
      <AppText variant="caption" color="ink2">
        {message}
      </AppText>
    </View>
  </View>
)

// TODO(1A): 약관·개인정보처리방침 URL 이 정해지면 링크를 연다
const TermsNotice = () => (
  <AppText variant="micro" color="ink3" style={styles.notice}>
    {'시작하면 '}
    <AppText variant="micro" color="ink2" style={styles.link}>
      이용약관
    </AppText>
    과{' '}
    <AppText variant="micro" color="ink2" style={styles.link}>
      개인정보처리방침
    </AppText>
    에 동의하게 돼요
  </AppText>
)

// SCR-01 로그인 · 로그인 실패. 로그인 후 이동(프로필·페어링·탭)은 인증 게이트가 맡는다
const LoginScreen = () => {
  const insets = useSafeAreaInsets()
  const { login, isPending, errorMessage } = useLogin()

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING[12] }]}>
      <View style={styles.hero}>
        <Icon name="heart" size={40} color="accent" strokeWidth={1.5} />
        <AppText variant="title" style={styles.brand} accessibilityRole="header">
          You-In-Heart
        </AppText>
        <AppText color="ink2">마음속에 간직하는 우리의 기록</AppText>
      </View>
      <View style={styles.actions}>
        {errorMessage ? <LoginErrorAlert message={errorMessage} /> : null}
        <KakaoLoginButton
          label={errorMessage ? '카카오로 다시 시도' : '카카오로 시작하기'}
          isPending={isPending}
          onPress={login}
        />
        {errorMessage ? (
          <AppText variant="micro" color="ink3" style={styles.notice}>
            카카오톡이 없으면 카카오 계정 웹 로그인으로 이어져요
          </AppText>
        ) : (
          <TermsNotice />
        )}
        {IS_DEV_LOGIN_ENABLED ? <DevLoginPanel /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 28, backgroundColor: COLORS.bg },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[4] },
  brand: { fontSize: 32, lineHeight: 42 },
  actions: { gap: SPACING[4] },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  alertText: { flex: 1, gap: 2 },
  notice: { textAlign: 'center', fontSize: 12, lineHeight: 19 },
  link: { fontSize: 12, textDecorationLine: 'underline' },
})

export default LoginScreen
