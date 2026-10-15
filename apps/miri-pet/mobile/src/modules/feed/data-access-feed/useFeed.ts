import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { type FeedPageParam, type FeedSlice, nextFeedParam } from '../util-feed/feed-pages'
import { fetchFeed } from './feed-api'

export const FEED_QUERY_KEY = ['feed'] as const
export const FOLLOWING_FEED_QUERY_KEY = ['feed', 'following'] as const
export const EXPLORE_FEED_QUERY_KEY = ['feed', 'explore'] as const

const INITIAL_HOME: FeedPageParam = { source: 'home', cursor: null }
// 첫 페이지 커서. 반환 타입을 명시해 pageParam이 string | null로 추론되게 한다
const firstCursor = (): string | null => null

const loadSlice = async ({ source, cursor }: FeedPageParam): Promise<FeedSlice> => {
  const page =
    source === 'home'
      ? await fetchFeed({ source, cursor })
      : await fetchFeed({ source, cursor, excludeFollowing: true })
  return { source, page }
}

// 팔로잉 탭: 홈 → (fallback) → 추천(explore). fallback이 오면 스크롤을 기다리지 않고 추천 첫 페이지를 바로 붙인다
export const useFollowingFeed = () => {
  const query = useInfiniteQuery({
    queryKey: FOLLOWING_FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => loadSlice(pageParam),
    initialPageParam: INITIAL_HOME,
    getNextPageParam: nextFeedParam,
  })
  const lastSlice = query.data?.pages[query.data.pages.length - 1]
  const isHomeExhausted = lastSlice?.source === 'home' && lastSlice.page.fallback === 'explore'
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  useEffect(() => {
    if (isHomeExhausted && hasNextPage && !isFetchingNextPage) fetchNextPage().catch(() => undefined)
  }, [isHomeExhausted, hasNextPage, isFetchingNextPage, fetchNextPage])
  return query
}

// 탐색 탭: 전체 최신순
export const useExploreFeed = () =>
  useInfiniteQuery({
    queryKey: EXPLORE_FEED_QUERY_KEY,
    queryFn: async ({ pageParam }): Promise<FeedSlice> => ({
      source: 'explore',
      page: await fetchFeed({ source: 'explore', cursor: pageParam }),
    }),
    initialPageParam: firstCursor(),
    getNextPageParam: (slice) => slice.page.nextCursor ?? undefined,
  })
