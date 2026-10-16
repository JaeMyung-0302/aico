import type { Conversation, MemberState } from '@miri-pet/shared'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { acceptConversation, fetchConversation, fetchConversations, hideConversation, openConversation } from './dm-api'
import { conversationQueryKey, conversationsQueryKey, DM_QUERY_KEY } from './query-keys'

const firstCursor = (): string | null => null

export const useConversations = (state: MemberState) =>
  useInfiniteQuery({
    queryKey: conversationsQueryKey(state),
    queryFn: ({ pageParam }) => fetchConversations(state, pageParam),
    initialPageParam: firstCursor(),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

export const useConversation = (conversationId: string) =>
  useQuery({ queryKey: conversationQueryKey(conversationId), queryFn: () => fetchConversation(conversationId) })

const useDmMutation = <T>(mutationFn: (conversationId: string) => Promise<T>) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => mutationFn(conversationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DM_QUERY_KEY }),
  })
}

export const useAcceptConversation = () => useDmMutation(acceptConversation)
export const useHideConversation = () => useDmMutation(hideConversation)

// 17 프로필 "메시지": 대화를 만들거나(있으면 그대로) 받아서 대화방으로 이동
export const useStartConversation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => openConversation(userId),
    onSuccess: (conversation: Conversation) => {
      queryClient.setQueryData(conversationQueryKey(conversation.id), conversation)
      router.push(`/dm/${conversation.id}`)
    },
  })
}
