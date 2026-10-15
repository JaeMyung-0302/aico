import type { ReactElement } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useMe } from '@/modules/user/data-access-me/useMe'
import PostCard from '../ui-post-card/PostCard'
import type { FeedRow } from '../util-feed/feed-pages'

export type FeedListProps = {
  rows: readonly FeedRow[]
  header: ReactElement | null
  isLoading: boolean
  isError: boolean
  isFetchingNextPage: boolean
  isRefreshing: boolean
  onEndReached: () => void
  onRefresh: () => void
}

const keyOf = (row: FeedRow) => (row.type === 'post' ? row.post.id : 'divider')

// 피드 공통 목록: 게시물 카드 + "추천 게시물" 구분선 + 무한 스크롤 + 당겨서 새로고침
const FeedList = ({
  rows,
  header,
  isLoading,
  isError,
  isFetchingNextPage,
  isRefreshing,
  onEndReached,
  onRefresh,
}: FeedListProps) => {
  const me = useMe()
  const renderRow = ({ item }: { item: FeedRow }) =>
    item.type === 'divider' ? (
      <View accessibilityRole="header" style={styles.divider}>
        <View style={styles.line} />
        <AppText variant="captionStrong" color="ink3">
          추천 게시물
        </AppText>
        <View style={styles.line} />
      </View>
    ) : (
      <PostCard post={item.post} isMine={item.post.author.id === me.data?.id} />
    )

  const empty = isLoading ? (
    <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  ) : (
    <View style={styles.empty}>
      <AppText variant="title3">{isError ? '피드를 불러오지 못했어요' : '아직 게시물이 없어요'}</AppText>
      <AppText variant="callout" color="ink2">
        {isError ? '당겨서 다시 시도해 주세요.' : '첫 산책 사진을 올려 보세요.'}
      </AppText>
    </View>
  )

  return (
    <FlatList
      data={rows}
      keyExtractor={keyOf}
      renderItem={renderRow}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={COLORS.primary} /> : null
      }
      ItemSeparatorComponent={Separator}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.content}
      style={styles.list}
    />
  )
}

const Separator = () => <View style={styles.separator} />

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.ground },
  content: { paddingTop: SPACING.md, paddingBottom: SPACING.xxl, flexGrow: 1 },
  separator: { height: SPACING.md },
  loading: { marginTop: SPACING.xxxl },
  footer: { marginVertical: SPACING.lg },
  empty: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xxl, marginTop: SPACING.xxxl },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
})

export default FeedList
