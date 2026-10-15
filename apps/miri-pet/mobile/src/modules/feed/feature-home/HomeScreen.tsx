import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Chip from '@/design-system/components/Chip'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useUnreadNotificationCount } from '@/modules/notifications/data-access-notifications/useNotifications'
import FollowingFeed, { ExploreFeed } from '../ui-feed-list/FollowingFeed'
import VaccineDdayBanner from '../ui-vaccine-dday-banner/VaccineDdayBanner'

type FeedTab = 'following' | 'explore'

const TABS: readonly { key: FeedTab; label: string }[] = [
  { key: 'following', label: '팔로잉' },
  { key: 'explore', label: '탐색' },
]

// 04 홈: 로고 · 새 게시물 · 알림(안 읽음 점) / 팔로잉·탐색 / 접종 D-day 배너 + 피드
const HomeScreen = () => {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<FeedTab>('following')
  const unread = useUnreadNotificationCount()
  const hasUnread = (unread.data?.count ?? 0) > 0

  const banner = <VaccineDdayBanner />
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.brand}>
          <View style={styles.logo} />
          <AppText variant="title2" accessibilityRole="header">
            미리펫
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 게시물"
          onPress={() => router.push('/posts/new')}
          style={styles.iconButton}
        >
          <Icon name="plus" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasUnread ? '알림, 새 알림 있음' : '알림'}
          onPress={() => router.push('/notifications')}
          style={styles.iconButton}
        >
          <Icon name="bell" />
          {hasUnread ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: tab === key }}
            isSelected={tab === key}
            onPress={() => setTab(key)}
          />
        ))}
      </View>
      {tab === 'following' ? <FollowingFeed header={banner} /> : <ExploreFeed header={banner} />}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logo: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary },
  iconButton: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.danger,
  },
  tabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
})

export default HomeScreen
