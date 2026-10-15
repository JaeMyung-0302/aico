import type { ReactElement } from 'react'
import { useExploreFeed, useFollowingFeed } from '../data-access-feed/useFeed'
import { feedRows } from '../util-feed/feed-pages'
import FeedList from './FeedList'

type FeedProps = { header: ReactElement | null }

type InfiniteFeed = ReturnType<typeof useFollowingFeed> | ReturnType<typeof useExploreFeed>

const toListProps = (query: InfiniteFeed) => ({
  rows: feedRows(query.data?.pages ?? []),
  isLoading: query.isPending,
  isError: query.isError,
  isFetchingNextPage: query.isFetchingNextPage,
  isRefreshing: query.isRefetching && !query.isFetchingNextPage,
  onEndReached: () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage().catch(() => undefined)
  },
  onRefresh: () => {
    query.refetch().catch(() => undefined)
  },
})

// 04 팔로잉 탭: 팔로잉 ∪ 내 글 → 다 보면 "추천 게시물" 뒤에 탐색을 이어 붙인다
const FollowingFeed = ({ header }: FeedProps) => <FeedList header={header} {...toListProps(useFollowingFeed())} />

// 04 탐색 탭: 전체 최신순
export const ExploreFeed = ({ header }: FeedProps) => <FeedList header={header} {...toListProps(useExploreFeed())} />

export default FollowingFeed
