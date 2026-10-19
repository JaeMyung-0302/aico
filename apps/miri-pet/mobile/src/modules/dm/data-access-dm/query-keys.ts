import type { MemberState } from '@miri-pet/shared'

// 재연결하면 메시지는 after 커서로 놓친 것만 받고(catch-up-messages), 나머지 ['dm']은 다시 받는다(D5 복구)
export const DM_QUERY_KEY = ['dm'] as const
export const conversationsQueryKey = (state: MemberState) => ['dm', 'conversations', state] as const
export const conversationQueryKey = (conversationId: string) => ['dm', 'conversation', conversationId] as const
export const messagesQueryKey = (conversationId: string) => ['dm', 'messages', conversationId] as const
