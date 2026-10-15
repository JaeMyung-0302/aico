import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, fetchUnreadCount, readAllNotifications } from './notifications-api'

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const
export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'] as const
const LIST_QUERY_KEY = ['notifications', 'list'] as const
// 첫 페이지 커서. 반환 타입을 명시해 pageParam이 string | null로 추론되게 한다
const firstCursor = (): string | null => null

export const useNotifications = () =>
  useInfiniteQuery({
    queryKey: LIST_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: firstCursor(),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

const UNREAD_POLL_MS = 60_000

// 04 홈 종 아이콘 점: 안 읽은 알림이 있는지 (1분마다 갱신, 07 진입 시 read-all이 0으로 맞춘다)
export const useUnreadNotificationCount = () =>
  useQuery({ queryKey: UNREAD_COUNT_QUERY_KEY, queryFn: fetchUnreadCount, refetchInterval: UNREAD_POLL_MS })

// 07 진입 시 모두 읽음 → 종 아이콘 점을 끈다(목록의 읽음 표시는 다음 조회 때 반영)
export const useReadAllNotifications = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: readAllNotifications,
    onSuccess: () => queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 0 }),
  })
}
