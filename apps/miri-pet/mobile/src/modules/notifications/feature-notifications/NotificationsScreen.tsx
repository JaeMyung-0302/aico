import type { Notification } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { formatRelativeTime } from '@/shared/format/format-relative-time'
import { useNotifications, useReadAllNotifications } from '../data-access-notifications/useNotifications'
import {
  type NotificationSection,
  notificationHref,
  notificationSection,
  notificationText,
} from '../util-notification/notification-display'

type Section = { title: NotificationSection; data: Notification[] }

const toSections = (items: readonly Notification[]): Section[] =>
  items.reduce<Section[]>((sections, item) => {
    const title = notificationSection(item.createdAt)
    const last = sections[sections.length - 1]
    if (last?.title === title) return [...sections.slice(0, -1), { title, data: [...last.data, item] }]
    return [...sections, { title, data: [item] }]
  }, [])

const NotificationRow = ({ item }: { item: Notification }) => {
  const href = notificationHref(item)
  return (
    <Pressable
      accessibilityRole={href ? 'button' : undefined}
      disabled={!href}
      onPress={() => {
        if (href) router.push(href)
      }}
      style={[styles.row, item.readAt ? null : styles.unread]}
    >
      {item.actor ? (
        <Avatar name={item.actor.nickname} uri={item.actor.avatarUrl} size={40} />
      ) : (
        <View style={styles.systemIcon}>
          <Icon name="bell" size={20} color="onWarmSoft" />
        </View>
      )}
      <View style={styles.text}>
        <AppText variant="callout">{notificationText(item)}</AppText>
        <AppText variant="caption" color="ink3">
          {formatRelativeTime(item.createdAt)}
        </AppText>
      </View>
      {item.thumbUrl ? <Image source={{ uri: item.thumbUrl }} style={styles.thumb} contentFit="cover" /> : null}
    </Pressable>
  )
}

// 07 알림함: 진입하면 모두 읽음 처리, 오늘/이번 주/이전 구역, 누르면 대상으로 이동
const NotificationsScreen = () => {
  const notifications = useNotifications()
  const readAll = useReadAllNotifications()
  const { mutate: markAllRead } = readAll

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  const items = notifications.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <View style={styles.screen}>
      <AppHeader title="알림" />
      {notifications.isPending ? <ActivityIndicator style={styles.loading} color={COLORS.primary} /> : null}
      {notifications.isSuccess && items.length === 0 ? (
        <EmptyLayout title="아직 알림이 없어요" description="좋아요·댓글·팔로우 소식이 여기에 모여요." />
      ) : null}
      {notifications.isError ? <EmptyLayout title="알림을 불러오지 못했어요" /> : null}
      {items.length > 0 ? (
        <SectionList
          sections={toSections(items)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="captionStrong" color="ink2" accessibilityRole="header" style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
          stickySectionHeadersEnabled={false}
          onEndReached={() => {
            if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
              notifications.fetchNextPage().catch(() => undefined)
            }
          }}
          refreshing={notifications.isRefetching && !notifications.isFetchingNextPage}
          onRefresh={() => {
            notifications.refetch().catch(() => undefined)
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  loading: { marginTop: SPACING.xxxl },
  sectionTitle: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  unread: { backgroundColor: COLORS.primarySoft },
  systemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.warmSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: SPACING.xxs },
  thumb: { width: 44, height: 44, borderRadius: RADIUS.sm },
})

export default NotificationsScreen
