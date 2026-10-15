import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useLogout } from '@/modules/auth/data-access-auth/useLogout'
import { useBlockedUsers, useUnblockUser } from '@/modules/moderation/data-access-moderation/useModeration'
import BlockedUsersSheet from '@/modules/settings/ui-blocked-users-sheet/BlockedUsersSheet'
import NotificationSettings, {
  type NotificationField,
} from '@/modules/settings/ui-notification-settings/NotificationSettings'
import { SettingsRow, SettingsSection } from '@/modules/settings/ui-settings-section/SettingsSection'
import WithdrawDialog from '@/modules/settings/ui-withdraw-dialog/WithdrawDialog'
import { useDeleteMe } from '@/modules/user/data-access-me/useDeleteMe'
import { useMe, useUpdateMe } from '@/modules/user/data-access-me/useMe'
import type { LegalDocument } from '@/shared/config/legal-urls'
import { openLegalDocument } from '@/shared/config/open-legal-document'

const LEGAL_LINKS: readonly { document: LegalDocument; label: string }[] = [
  { document: 'terms', label: '이용약관' },
  { document: 'privacy', label: '개인정보 처리방침' },
  { document: 'location', label: '위치기반서비스 이용약관' },
]

// 디자인 19 설정 — 로그아웃·탈퇴 후 이동은 인증 게이트가 맡는다
const SettingsScreen = () => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  const updateMe = useUpdateMe()
  const blockedUsers = useBlockedUsers()
  const unblockUser = useUnblockUser()
  const logout = useLogout()
  const deleteMe = useDeleteMe()
  const [isBlockedSheetVisible, setIsBlockedSheetVisible] = useState(false)
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false)

  const handleNotificationToggle = (field: NotificationField, next: boolean) => updateMe.mutate({ [field]: next })
  const handleUnblock = (userId: string) => unblockUser.mutate(userId)
  const handleWithdrawClose = () => {
    setIsWithdrawVisible(false)
    deleteMe.reset()
  }

  const blockedCount = blockedUsers.data?.length

  return (
    <View style={styles.screen}>
      <AppHeader title="설정" />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACING.xxl }]}>
        {me.data ? <NotificationSettings values={me.data} onToggle={handleNotificationToggle} /> : null}

        <SettingsSection title="개인정보 · 안전">
          <SettingsRow
            label="차단한 사용자"
            value={blockedCount === undefined ? undefined : `${blockedCount}명`}
            onPress={() => setIsBlockedSheetVisible(true)}
          />
          <SettingsRow label="동의 내역 관리" onPress={() => router.push('/settings/consents')} />
        </SettingsSection>

        <SettingsSection title="정보">
          {LEGAL_LINKS.map(({ document, label }) => (
            <SettingsRow
              key={document}
              label={label}
              accessibilityRole="link"
              onPress={() => openLegalDocument(document)}
            />
          ))}
        </SettingsSection>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={logout.isPending}
            onPress={() => logout.mutate()}
            style={styles.footerButton}
          >
            <AppText variant="calloutStrong" color="ink2">
              로그아웃
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setIsWithdrawVisible(true)} style={styles.footerButton}>
            <AppText variant="calloutStrong" color="danger">
              회원 탈퇴
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      <BlockedUsersSheet
        isVisible={isBlockedSheetVisible}
        onClose={() => setIsBlockedSheetVisible(false)}
        users={blockedUsers.data ?? []}
        onUnblock={handleUnblock}
        pendingUserId={unblockUser.isPending ? (unblockUser.variables ?? null) : null}
      />
      <WithdrawDialog
        isVisible={isWithdrawVisible}
        onClose={handleWithdrawClose}
        onConfirm={() => deleteMe.mutate()}
        isSubmitting={deleteMe.isPending}
        errorMessage={deleteMe.isError ? '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요' : null}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ground },
  body: { paddingTop: SPACING.md + 2, paddingHorizontal: SPACING.lg, gap: SPACING.md + 2 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg },
  footerButton: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
})

export default SettingsScreen
