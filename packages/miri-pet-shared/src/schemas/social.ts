import { z } from 'zod'
import { cursorQuerySchema, idSchema } from './common'
import { userSummarySchema } from './user'

export const createCommentRequestSchema = z.object({
  body: z.string().trim().min(1).max(500),
})
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>

export const commentSchema = z.object({
  id: idSchema,
  postId: idSchema,
  author: userSummarySchema,
  body: z.string(),
  createdAt: z.string(),
})
export type Comment = z.infer<typeof commentSchema>

export const likeResultSchema = z.object({
  isLiked: z.boolean(),
  likeCount: z.number().int(),
})
export type LikeResult = z.infer<typeof likeResultSchema>

export const followResultSchema = z.object({ isFollowing: z.boolean() })
export type FollowResult = z.infer<typeof followResultSchema>

export const commentPageSchema = z.object({
  items: z.array(commentSchema),
  nextCursor: idSchema.nullable(),
})
export type CommentPage = z.infer<typeof commentPageSchema>

// 팔로워·팔로잉 목록: 커서 = 마지막 항목의 사용자 id
export const userPageSchema = z.object({
  items: z.array(userSummarySchema),
  nextCursor: idSchema.nullable(),
})
export type UserPage = z.infer<typeof userPageSchema>

// GET /users?nickname= (접두어 검색)
export const userSearchQuerySchema = cursorQuerySchema.pick({ limit: true }).extend({
  nickname: z.string().trim().min(1).max(20),
})
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>
