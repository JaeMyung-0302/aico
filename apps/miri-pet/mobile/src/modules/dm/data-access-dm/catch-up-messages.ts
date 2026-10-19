import type { Message, MessagePage } from '@miri-pet/shared'
import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query'
import { fetchMessagesAfter } from './dm-api'
import { DM_QUERY_KEY } from './query-keys'

type MessagesCache = InfiniteData<MessagePage, string | null>

const MESSAGES_QUERY_PREFIX = [...DM_QUERY_KEY, 'messages'] as const
// 서버가 같은 커서를 계속 돌려주는 등 이상할 때 무한 반복하지 않는다 → 넘으면 처음부터 다시 받는다
const MAX_CATCH_UP_PAGES = 10

// after 이후 메시지를 마지막 페이지까지 오래된순으로 모은다
const fetchAllAfter = async (conversationId: string, after: string, pageCount = 1): Promise<Message[]> => {
  if (pageCount > MAX_CATCH_UP_PAGES) throw new Error('DM catch-up page limit exceeded')
  const page = await fetchMessagesAfter(conversationId, after)
  if (!page.nextCursor) return page.items
  return [...page.items, ...(await fetchAllAfter(conversationId, page.nextCursor, pageCount + 1))]
}

// 오래된순 newer를 최신순 첫 페이지 앞에 붙인다. 이미 있는 id(소켓·전송으로 먼저 들어온 메시지)는 건너뛴다
const mergeNewer = (current: MessagesCache | undefined, newer: readonly Message[]): MessagesCache | undefined => {
  const [first, ...rest] = current?.pages ?? []
  if (!current || !first) return current
  const known = new Set(current.pages.flatMap((page) => page.items.map((item) => item.id)))
  const fresh = newer.filter((item, index) => !known.has(item.id) && newer.findIndex((m) => m.id === item.id) === index)
  if (fresh.length === 0) return current
  return { ...current, pages: [{ ...first, items: [...[...fresh].reverse(), ...first.items] }, ...rest] }
}

const catchUpOne = async (queryClient: QueryClient, queryKey: QueryKey, data: MessagesCache | undefined) => {
  const newest = data?.pages[0]?.items[0]
  if (!newest) {
    await queryClient.invalidateQueries({ queryKey, exact: true })
    return
  }
  try {
    const newer = await fetchAllAfter(newest.conversationId, newest.id)
    queryClient.setQueryData<MessagesCache>(queryKey, (current) => mergeNewer(current, newer))
  } catch {
    await queryClient.invalidateQueries({ queryKey, exact: true })
  }
}

// 소켓 재연결 시: 캐시에 있는 대화마다 마지막으로 받은 메시지 이후(after)만 받아 합친다(목록 전체를 다시 받지 않는다)
export const catchUpMessages = async (queryClient: QueryClient): Promise<void> => {
  const cached = queryClient.getQueriesData<MessagesCache>({ queryKey: MESSAGES_QUERY_PREFIX })
  await Promise.all(cached.map(([queryKey, data]) => catchUpOne(queryClient, queryKey, data)))
}

export const isMessagesQueryKey = (queryKey: QueryKey): boolean =>
  queryKey[0] === MESSAGES_QUERY_PREFIX[0] && queryKey[1] === MESSAGES_QUERY_PREFIX[1]
