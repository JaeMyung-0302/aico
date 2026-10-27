import { router } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppHeader from '@/design-system/components/AppHeader'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { useLocationConsent } from '@/modules/settings/feature-location-consent/useLocationConsent'
import TimelineCard from '@/modules/timeline/ui-timeline-card/TimelineCard'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { usePlace, usePlaceEntries } from '../data-access-place/usePlaces'

const FORMER_MEMBER = '탈퇴한 사용자'

// SCR-10 핀의 기록 전체(최신순). 장소 이름은 위치 동의가 있을 때만 받는다(서버 403)
const PlaceEntriesScreen = ({ placeId }: { placeId: string }) => {
  const insets = useSafeAreaInsets()
  const me = useMe()
  const couple = useCouple({ isEnabled: Boolean(me.data?.couple) })
  const consent = useLocationConsent()
  const place = usePlace(placeId, { isEnabled: consent.isOn })
  const entries = usePlaceEntries(placeId)
  const items = entries.data?.pages.flatMap((page) => page.items) ?? []
  const authorName = (authorId: string | null) =>
    authorId ? (couple.data?.members.find((member) => member.userId === authorId)?.displayName ?? '상대') : FORMER_MEMBER
  const loadMore = () => {
    if (entries.hasNextPage && !entries.isFetchingNextPage) entries.fetchNextPage().catch(() => undefined)
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={place.data?.name ?? '다녀온 곳'} />
      {entries.isError ? (
        <EmptyLayout icon="alert" title="기록을 불러오지 못했어요" onRetry={() => entries.refetch()} />
      ) : null}
      {entries.isSuccess && items.length === 0 ? (
        <EmptyLayout icon="map" title="아직 이곳에 이어진 기록이 없어요" />
      ) : null}
      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + SPACING[8] }]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={entries.isFetchingNextPage ? <ActivityIndicator color={COLORS.ink3} /> : null}
          renderItem={({ item }) => (
            <TimelineCard entry={item} authorName={authorName(item.authorId)} onPress={() => router.push(`/diary/${item.id}`)} />
          )}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  list: { paddingHorizontal: SPACING.screen, gap: SPACING[6] },
})

export default PlaceEntriesScreen
