import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLogout } from '@/modules/auth/data-access-auth/useLogout'
import { useSubmitConsents } from '@/modules/consent/data-access-consent/useConsent'
import ConsentForm from '@/modules/consent/ui-consent-form/ConsentForm'
import { buildConsentRequest, type ConsentFormValues } from '@/modules/consent/util-consent/build-consent-request'
import { openLegalDocument } from '@/shared/config/open-legal-document'

// 디자인 02 약관 동의 — 저장되면 인증 게이트가 다음 화면으로 보낸다
const ConsentScreen = () => {
  const insets = useSafeAreaInsets()
  const submitConsents = useSubmitConsents()
  const logout = useLogout()

  const handleSubmit = (values: ConsentFormValues) => {
    const request = buildConsentRequest(values)
    if (request) submitConsents.mutate(request)
  }

  // 동의 전에는 돌아갈 화면이 없다 → 뒤로 = 로그아웃 후 로그인 화면
  const handleBackPress = () => logout.mutate()

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <AppHeader onBackPress={handleBackPress} />
      <View style={styles.intro}>
        <AppText variant="captionStrong" color="primary" style={styles.step}>
          1 / 2
        </AppText>
        <AppText variant="title1" accessibilityRole="header">
          {'미리펫을 시작하기 전에\n확인해 주세요'}
        </AppText>
      </View>
      <View style={styles.body}>
        <ConsentForm
          onSubmit={handleSubmit}
          onOpenDocument={openLegalDocument}
          isSubmitting={submitConsents.isPending}
        />
        {submitConsents.isError ? (
          <AppText variant="callout" color="danger" accessibilityLiveRegion="polite" style={styles.error}>
            저장하지 못했어요. 잠시 후 다시 시도해 주세요
          </AppText>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  intro: { paddingTop: SPACING.xxxl, paddingHorizontal: SPACING.xxl, gap: SPACING.sm },
  step: { fontSize: 13 },
  body: { flex: 1, paddingTop: SPACING.xxl + SPACING.xs, paddingHorizontal: SPACING.xxl },
  error: { marginTop: SPACING.sm, textAlign: 'center' },
})

export default ConsentScreen
