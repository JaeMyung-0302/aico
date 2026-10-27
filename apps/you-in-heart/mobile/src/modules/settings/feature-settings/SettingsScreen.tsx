import { router } from 'expo-router'
import { type ReactNode, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import ListRow from '@/design-system/components/ListRow'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useLogout } from '@/modules/auth/data-access-auth/useLogout'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'
import { useDeleteMe, useMe } from '@/modules/user/data-access-me/useMe'
import ExportSection from '../feature-export/ExportSection'
import LocationConsentToggle from '../feature-location-consent/LocationConsentToggle'
import UnlinkSection from '../feature-unlink/UnlinkSection'
import WithdrawDialog from '../ui-withdraw-dialog/WithdrawDialog'

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View>
    <AppText variant="captionStrong" color="ink3" style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </AppText>
    {children}
  </View>
)

// SCR-16 설정. 로그아웃·탈퇴 후 이동은 인증 게이트가 맡는다
// TODO(1B~2C): 위젯 대표 사진, 앱 잠금·알림 토글
const SettingsScreen = () => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  const couple = useCouple({ isEnabled: Boolean(me.data?.couple) })
  const logout = useLogout()
  const deleteMe = useDeleteMe()
  const [isWithdrawVisible, setIsWithdrawVisible] = useState(false)
  const startedOn = couple.data?.startedOn ?? me.data?.couple?.startedOn ?? null

  const handleWithdrawClose = () => {
    setIsWithdrawVisible(false)
    deleteMe.reset()
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={couple.data?.status === 'UNLINKING' ? '연결 상태' : '설정'} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + SPACING[8] }}>
        <Section title="우리">
          <ListRow title="내 표시 이름" value={me.data?.displayName ?? undefined} />
          <ListRow
            title="사귄 날"
            value={startedOn ? formatDotDate(startedOn) : '입력하기'}
            onPress={() => router.push('/pairing/started-on')}
          />
        </Section>
        <Section title="보호와 알림">
          <LocationConsentToggle />
        </Section>
        {couple.data && me.data ? (
          <Section title="데이터">
            <ExportSection />
            <UnlinkSection couple={couple.data} myUserId={me.data.id} />
          </Section>
        ) : null}
        <Section title="계정">
          <ListRow title="로그아웃" trailing={null} onPress={() => logout.mutate()} isDisabled={logout.isPending} />
          <ListRow title="회원 탈퇴" titleColor="ink2" trailing={null} onPress={() => setIsWithdrawVisible(true)} />
        </Section>
      </ScrollView>
      <WithdrawDialog
        isVisible={isWithdrawVisible}
        isSubmitting={deleteMe.isPending}
        errorMessage={deleteMe.isError ? '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요' : null}
        onClose={handleWithdrawClose}
        onConfirm={() => deleteMe.mutate()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  sectionTitle: { paddingTop: 18, paddingHorizontal: SPACING.screen, paddingBottom: SPACING[1] },
})

export default SettingsScreen
