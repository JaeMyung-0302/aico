import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchDiaryPage } from '@/modules/diary/data-access-diary/diary-api'
import { DIARY_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'

// 첫 쪽은 커서 없음 (함수로 두어 타입이 undefined 로 좁혀지지 않게 한다)
const firstPage = (): string | undefined => undefined

// SCR-07 최신순 피드. before(월 점프)마다 따로 캐시하고, 끝까지 내리면 nextCursor 로 이어 받는다
export const useTimeline = (before: string | null) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useInfiniteQuery({
    queryKey: [...DIARY_QUERY_KEY, 'timeline', before ?? 'latest'],
    queryFn: ({ pageParam }) => fetchDiaryPage({ cursor: pageParam, before: before ?? undefined }),
    initialPageParam: firstPage(),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isSignedIn,
  })
}
