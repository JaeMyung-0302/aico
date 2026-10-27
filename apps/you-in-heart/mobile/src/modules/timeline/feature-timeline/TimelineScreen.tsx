import type { DiaryEntry } from '@you-in-heart/shared'
import { toKstDate } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, type ViewToken } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SHADOW } from '@/design-system/tokens/shadow'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useNow } from '@/shared/hooks/use-now'
import { useTimeline } from '../data-access-timeline/useTimeline'
import MonthJumpSheet from '../ui-month-jump/MonthJumpSheet'
import TimelineCard from '../ui-timeline-card/TimelineCard'
import { formatMonthLabel, monthJumpBefore, toYearMonth } from '../util-timeline/month-jump'

const MINUTE_MS = 60_000
const FORMER_MEMBER = '탈퇴한 사용자'

const useAuthorNames = () => {
  const me = useMe()
  const couple = useCouple({ isEnabled: Boolean(me.data?.couple) })
  return (authorId: string | null): string => {
    if (!authorId) return FORMER_MEMBER
    return couple.data?.members.find((member) => member.userId === authorId)?.displayName ?? '상대'
  }
}

// 화면 맨 위 카드의 달을 헤더에 보여준다 (스크롤하면 바뀐다)
const useVisibleMonth = () => {
  const [visibleMonth, setVisibleMonth] = useState<string | null>(null)
  // FlatList 는 이 콜백이 바뀌면 안 된다 → 의존성 없이 한 번만 만든다
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<DiaryEntry>[] }) => {
    const first = viewableItems[0]?.item
    if (first) setVisibleMonth(toYearMonth(first.happenedOn))
  }, [])
  return { visibleMonth, onViewableItemsChanged }
}

const EmptyTimeline = () => (
  <View style={styles.empty}>
    <Icon name="timeline" size={28} color="ink2" strokeWidth={1.6} />
    <AppText variant="title" style={styles.emptyTitle}>
      첫 페이지를 채워볼까요?
    </AppText>
    <AppText variant="label" color="ink2">
      사진 한 장과 한 줄이면 충분해요.
    </AppText>
    <Button label="기록 남기기" size="md" onPress={() => router.push('/diary/new')} style={styles.emptyButton} />
  </View>
)

// SCR-07 타임라인: 최신순 카드 무한 스크롤, 헤더의 달을 누르면 월 이동 시트(before=다음 달 1일)
const TimelineScreen = () => {
  const insets = useSafeAreaInsets()
  const nowMs = useNow(MINUTE_MS)
  const [before, setBefore] = useState<string | null>(null)
  const [isMonthSheetVisible, setIsMonthSheetVisible] = useState(false)
  const timeline = useTimeline(before)
  const authorName = useAuthorNames()
  const { visibleMonth, onViewableItemsChanged } = useVisibleMonth()
  const entries = timeline.data?.pages.flatMap((page) => page.items) ?? []
  const headerMonth = visibleMonth ?? (entries[0] ? toYearMonth(entries[0].happenedOn) : toYearMonth(toKstDate(nowMs)))
  const isEmpty = timeline.isSuccess && entries.length === 0 && before === null

  const loadMore = () => {
    if (timeline.hasNextPage && !timeline.isFetchingNextPage) timeline.fetchNextPage().catch(() => undefined)
  }

  if (timeline.isError && entries.length === 0) {
    return <EmptyLayout icon="alert" title="잠시 문제가 생겼어요" description="잠시 뒤 다시 시도해 주세요." onRetry={() => timeline.refetch()} />
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {isEmpty ? (
          <AppText variant="title">타임라인</AppText>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={formatMonthLabel(headerMonth)}
            onPress={() => setIsMonthSheetVisible(true)}
            style={styles.month}
          >
            <AppText variant="title">{formatMonthLabel(headerMonth)}</AppText>
            <Icon name="chevronDown" size={18} />
          </Pressable>
        )}
      </View>
      {isEmpty ? (
        <EmptyTimeline />
      ) : (
        <FlatList
          testID="timeline-list"
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <TimelineCard entry={item} authorName={authorName(item.authorId)} onPress={() => router.push(`/diary/${item.id}`)} />
          )}
          ListEmptyComponent={
            timeline.isSuccess ? (
              <AppText variant="label" color="ink2" style={styles.noOlder}>
                이 달까지 남긴 기록이 없어요
              </AppText>
            ) : null
          }
          ListFooterComponent={timeline.isFetchingNextPage ? <ActivityIndicator color={COLORS.ink3} /> : null}
        />
      )}
      {isEmpty ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel="기록 쓰기" onPress={() => router.push('/diary/new')} style={styles.fab}>
          <Icon name="plus" color="bg" size={24} strokeWidth={2} />
        </Pressable>
      )}
      {isMonthSheetVisible ? (
        <MonthJumpSheet
          isVisible
          selectedMonth={headerMonth}
          nowMs={nowMs}
          onClose={() => setIsMonthSheetVisible(false)}
          onSelect={(year, month) => {
            setBefore(monthJumpBefore(year, month))
            setIsMonthSheetVisible(false)
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { height: 52, paddingHorizontal: SPACING.screen, justifyContent: 'center' },
  month: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH_TARGET, alignSelf: 'flex-start' },
  list: { paddingHorizontal: SPACING.screen, paddingTop: SPACING[2], paddingBottom: 120, gap: 28 },
  noOlder: { textAlign: 'center', paddingVertical: SPACING[8] },
  fab: {
    position: 'absolute',
    right: SPACING[5],
    bottom: SPACING[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    ...SHADOW[1],
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[3], paddingHorizontal: 40, paddingBottom: 140 },
  emptyTitle: { fontSize: 20, textAlign: 'center' },
  emptyButton: { marginTop: SPACING[2] },
})

export default TimelineScreen
