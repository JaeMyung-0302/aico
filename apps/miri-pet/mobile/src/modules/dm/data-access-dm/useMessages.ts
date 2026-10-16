import type { Message, MessagePage } from '@miri-pet/shared'
import { type InfiniteData, type QueryClient, useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { fetchMessages, markConversationRead } from './dm-api'
import { messagesQueryKey } from './query-keys'

const firstCursor = (): string | null => null

// 최신순 페이지(inverted 리스트가 그대로 그린다)
export const useMessages = (conversationId: string) =>
  useInfiniteQuery({
    queryKey: messagesQueryKey(conversationId),
    queryFn: ({ pageParam }) => fetchMessages(conversationId, pageParam),
    initialPageParam: firstCursor(),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

// 보낸 메시지를 첫 페이지 맨 앞에 넣는다(이미 있으면 그대로)
export const prependMessage = (queryClient: QueryClient, message: Message): void => {
  queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
    messagesQueryKey(message.conversationId),
    (current) => {
      if (!current) return { pages: [{ items: [message], nextCursor: null }], pageParams: [null] }
      const exists = current.pages.some((page) => page.items.some((item) => item.id === message.id))
      if (exists) return current
      const [first, ...rest] = current.pages
      return { ...current, pages: [{ ...(first ?? { nextCursor: null }), items: [message, ...(first?.items ?? [])] }, ...rest] }
    },
  )
}

export const useMarkRead = (conversationId: string) =>
  useMutation({ mutationFn: (lastReadMessageId: string) => markConversationRead(conversationId, lastReadMessageId) })
