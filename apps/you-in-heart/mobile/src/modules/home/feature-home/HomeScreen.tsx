import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { isUnlinkingBannerVisible } from '@/modules/auth/util-auth-gate/resolve-auth-redirect'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { findPartnerName } from '@/modules/couple/util-pairing/partner-name'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useNow } from '@/shared/hooks/use-now'
import DdayBlock from './DdayBlock'
import StartedOnPrompt from './StartedOnPrompt'
import UnlinkingBanner from './UnlinkingBanner'

const MINUTE_MS = 60_000

// SCR-03 홈 (D-day). 최근 기록·문구·버킷리스트는 이후 단계에서 채운다
const HomeScreen = () => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  // 자정이 지나면 D-day 가 바뀌도록 1분마다 다시 그린다
  const now = useNow(MINUTE_MS)
  const couple = useCouple({ isEnabled: Boolean(me.data?.couple) })

  if (!me.data) {
    return me.isError ? (
      <EmptyLayout
        icon="alert"
        title="잠시 문제가 생겼어요"
        description={'기록은 안전하게 보관되어 있어요.\n잠시 뒤 다시 시도해 주세요.'}
        onRetry={() => me.refetch()}
      />
    ) : null
  }

  const startedOn = me.data.couple?.startedOn ?? null
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.body, { paddingTop: insets.top + SPACING[2] }]}>
      <View style={styles.header}>
        <AppText variant="body" color="ink2">
          {`${me.data.displayName ?? ''} · ${findPartnerName(couple.data, me.data.id)}`}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="설정"
          onPress={() => router.push('/settings')}
          style={styles.settings}
        >
          <Icon name="settings" color="ink2" />
        </Pressable>
      </View>
      {isUnlinkingBannerVisible(me.data) ? <UnlinkingBanner purgeAfter={me.data.couple?.purgeAfter ?? null} /> : null}
      {startedOn ? <DdayBlock startedOn={startedOn} nowMs={now} /> : <StartedOnPrompt />}
      <View style={styles.recent}>
        <AppText variant="bodyStrong">최근 기록</AppText>
        <View style={styles.emptyRecent}>
          <AppText variant="label" color="ink2">
            아직 남긴 기록이 없어요
          </AppText>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  body: { paddingHorizontal: SPACING.screen, paddingBottom: SPACING[8], gap: SPACING[5] },
  header: { height: TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settings: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'flex-end', justifyContent: 'center' },
  recent: { gap: 10 },
  emptyRecent: { alignItems: 'center', paddingVertical: 28, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
})

export default HomeScreen
