import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { useAnniversaries } from '@/modules/anniversary/data-access-anniversary/useAnniversaries'
import { findNextAnniversary } from '@/modules/anniversary/util-anniversary/anniversary-view'
import { isUnlinkingBannerVisible } from '@/modules/auth/util-auth-gate/resolve-auth-redirect'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { findPartnerName } from '@/modules/couple/util-pairing/partner-name'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useNow } from '@/shared/hooks/use-now'
import DdayHero from '../ui-dday-hero/DdayHero'
import HomeHeader from './HomeHeader'
import NextAnniversaryCard from './NextAnniversaryCard'
import QuoteCard from './QuoteCard'
import StartedOnPrompt from './StartedOnPrompt'
import UnlinkingBanner from './UnlinkingBanner'
import WidgetHint from './WidgetHint'

const MINUTE_MS = 60_000

// SCR-03 홈 (D-day). 유예 중(읽기 전용)에는 배너 + D-day + 최근 기록만 보인다
// TODO(1D): 최근 기록·기록 쓰기 FAB, TODO(3C·4C): 버킷리스트·문구 보관함 바로가기
const HomeScreen = () => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  // 자정이 지나면 D-day 가 바뀌도록 1분마다 다시 그린다
  const now = useNow(MINUTE_MS)
  const hasCouple = Boolean(me.data?.couple)
  const couple = useCouple({ isEnabled: hasCouple })
  const anniversaries = useAnniversaries({ isEnabled: hasCouple })

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
  const isUnlinking = isUnlinkingBannerVisible(me.data)
  const next = anniversaries.data ? findNextAnniversary(anniversaries.data, now) : null
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.body, { paddingTop: insets.top + SPACING[2] }]}>
      <HomeHeader title={`${me.data.displayName ?? ''} · ${findPartnerName(couple.data, me.data.id)}`} />
      {isUnlinking ? <UnlinkingBanner purgeAfter={me.data.couple?.purgeAfter ?? null} /> : null}
      {startedOn ? <DdayHero startedOn={startedOn} nowMs={now} /> : <StartedOnPrompt />}
      {!isUnlinking && next ? <NextAnniversaryCard anniversary={next} nowMs={now} /> : null}
      {isUnlinking ? null : <QuoteCard />}
      {isUnlinking ? null : <WidgetHint />}
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
  recent: { gap: 10 },
  emptyRecent: { alignItems: 'center', paddingVertical: 28, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface },
})

export default HomeScreen
