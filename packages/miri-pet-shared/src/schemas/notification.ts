import { z } from 'zod'
import { idSchema } from './common'
import { userSummarySchema } from './user'

export const notificationKindSchema = z.enum([
  'LIKE',
  'COMMENT',
  'FOLLOW',
  'DM_REQUEST',
  'VACCINATION_DUE',
  'PLACE_REPORT_REVIEWED',
])
export type NotificationKind = z.infer<typeof notificationKindSchema>

export const notificationSchema = z.object({
  id: idSchema,
  kind: notificationKindSchema,
  actor: userSummarySchema.nullable(),
  refId: z.string().nullable(),
  // LIKE·COMMENT: 이동할 게시물(볼 수 없게 됐으면 null), 썸네일, 댓글 미리보기
  postId: idSchema.nullable(),
  thumbUrl: z.string().nullable(),
  preview: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})
export type Notification = z.infer<typeof notificationSchema>

export const notificationPageSchema = z.object({
  items: z.array(notificationSchema),
  nextCursor: idSchema.nullable(),
})
export type NotificationPage = z.infer<typeof notificationPageSchema>

export const unreadCountSchema = z.object({ count: z.number().int() })
export type UnreadCount = z.infer<typeof unreadCountSchema>

export const registerPushTokenRequestSchema = z.object({
  expoToken: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/),
  platform: z.enum(['ios', 'android']),
})
export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>

// 푸시 data 페이로드 (서버 PushService 발송 → 모바일 탭 시 화면 이동). VACCINATION_DUE의 잘못된 petId는 무시한다
export const pushDataSchema = z.union([
  z.object({ kind: z.literal('DM'), conversationId: idSchema }),
  z.object({ kind: z.literal(['LIKE', 'COMMENT']), postId: idSchema }),
  z.object({ kind: z.literal('FOLLOW'), userId: idSchema }),
  z.object({ kind: z.literal('VACCINATION_DUE'), petId: idSchema.optional().catch(undefined) }),
])
export type PushData = z.infer<typeof pushDataSchema>
