import type { MemberState } from '@miri-pet/shared'

// 재연결하면 ['dm'] 전체를 다시 받는다(D5 복구)
export const DM_QUERY_KEY = ['dm'] as const
export const conversationsQueryKey = (state: MemberState) => ['dm', 'conversations', state] as const
export const conversationQueryKey = (conversationId: string) => ['dm', 'conversation', conversationId] as const
export const messagesQueryKey = (conversationId: string) => ['dm', 'messages', conversationId] as const
