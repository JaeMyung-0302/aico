import type { ConsentKind } from '@miri-pet/shared'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Toast from '@/design-system/components/Toast'
import Toggle from '@/design-system/components/Toggle'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useTransientMessage } from '@/shared/hooks/use-transient-message'
import {
  useMyConsents,
  useUpdateConsent,
  useWithdrawCertificateConsent,
} from '../data-access-consents/useMyConsents'
import ConsentWithdrawDialog from '../ui-consent-withdraw-dialog/ConsentWithdrawDialog'
import { SettingsRow, SettingsSection } from '../ui-settings-section/SettingsSection'
import { buildConsentRows, type ConsentRow } from '../util-consents/consent-rows'

const FAILURE_MESSAGE = '바꾸지 못했어요. 잠시 후 다시 시도해 주세요'

const WITHDRAW_DESCRIPTIONS: Partial<Record<ConsentKind, string>> = {
  LOCATION: '철회하면 지도에서 내 위치를 쓸 수 없어요. 언제든 다시 동의할 수 있어요.',
  MARKETING: '이벤트 · 혜택 소식을 더 이상 보내지 않아요.',
  CERTIFICATE: '철회하면 보관된 증명서 사진이 모두 지워져요. 접종 기록은 그대로 남아요.',
}

// 디자인 19 설정 > 동의 내역 관리: 필수(철회 = 탈퇴 안내), 선택(토글), 증명서 보관(읽기 전용 + 철회)
const ConsentsScreen = () => {
  const insets = useSafeAreaInsets()
  const consents = useMyConsents()
  const updateConsent = useUpdateConsent()
  const withdrawCertificate = useWithdrawCertificateConsent()
  const toast = useTransientMessage()
  const [withdrawTarget, setWithdrawTarget] = useState<ConsentRow | null>(null)

  const handleAgree = (row: ConsentRow) =>
    updateConsent.mutate(
      { kind: row.kind, isAgreed: true },
      {
        onSuccess: () => toast.show(`${row.label}에 동의했어요`),
        onError: () => toast.show(FAILURE_MESSAGE),
      },
    )

  const handleToggle = (row: ConsentRow, next: boolean) => (next ? handleAgree(row) : setWithdrawTarget(row))

  const handleWithdrawConfirm = () => {
    if (!withdrawTarget) return
    const target = withdrawTarget
    const callbacks = {
      onSuccess: () => toast.show(`${target.label} 동의를 철회했어요`),
      onError: () => toast.show(FAILURE_MESSAGE),
      onSettled: () => setWithdrawTarget(null),
    }
    if (target.group === 'certificate') withdrawCertificate.mutate(undefined, callbacks)
    else updateConsent.mutate({ kind: target.kind, isAgreed: false }, callbacks)
  }

  const rows = consents.data ? buildConsentRows(consents.data) : []
  const rowsOf = (group: ConsentRow['group']) => rows.filter((row) => row.group === group)

  return (
    <View style={styles.screen}>
      <AppHeader title="동의 내역 관리" />
      {consents.isError ? (
        <EmptyLayout
          title="동의 내역을 불러오지 못했어요"
          onRetry={() => {
            consents.refetch().catch(() => undefined)
          }}
        />
      ) : null}
      {consents.isPending ? <ActivityIndicator style={styles.loading} color={COLORS.primary} /> : null}
      {consents.data ? (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING.xxl }]}>
          <View>
            <SettingsSection title="필수 동의">
              {rowsOf('required').map((row) => (
                <SettingsRow key={row.kind} label={row.label} value={row.status} />
              ))}
            </SettingsSection>
            <AppText variant="caption" color="ink3" style={styles.note}>
              필수 동의를 철회하려면 회원 탈퇴를 해야 해요. 설정의 회원 탈퇴에서 진행할 수 있어요.
            </AppText>
          </View>

          <SettingsSection title="선택 동의">
            {rowsOf('optional').map((row) => (
              <SettingsRow
                key={row.kind}
                label={row.label}
                value={row.status}
                trailing={
                  <Toggle
                    label={row.label}
                    isOn={row.isAgreed}
                    isDisabled={updateConsent.isPending}
                    onChange={(next) => handleToggle(row, next)}
                  />
                }
              />
            ))}
          </SettingsSection>

          <SettingsSection title="증명서">
            {rowsOf('certificate').map((row) => (
              <SettingsRow
                key={row.kind}
                label={row.label}
                value={row.status}
                trailing={
                  row.isAgreed ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${row.label} 동의 철회`}
                      onPress={() => setWithdrawTarget(row)}
                      style={styles.textButton}
                    >
                      <AppText variant="calloutStrong" color="danger">
                        철회
                      </AppText>
                    </Pressable>
                  ) : null
                }
              />
            ))}
          </SettingsSection>
        </ScrollView>
      ) : null}

      <ConsentWithdrawDialog
        target={
          withdrawTarget
            ? { label: withdrawTarget.label, description: WITHDRAW_DESCRIPTIONS[withdrawTarget.kind] ?? '' }
            : null
        }
        isSubmitting={updateConsent.isPending || withdrawCertificate.isPending}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={handleWithdrawConfirm}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ground },
  loading: { marginTop: SPACING.xxxl },
  body: { paddingTop: SPACING.md + 2, paddingHorizontal: SPACING.lg, gap: SPACING.md + 2 },
  note: { paddingHorizontal: SPACING.xs, paddingTop: SPACING.xs + 2 },
  textButton: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
})

export default ConsentsScreen
