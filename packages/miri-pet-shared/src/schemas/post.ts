import { z } from 'zod'
import { cursorQuerySchema, idSchema } from './common'
import { placeCategorySchema } from './place'
import { userSummarySchema } from './user'
import { MAX_PETS_PER_POST, MAX_POST_IMAGES } from '../constants/limits'

export const createPostRequestSchema = z.object({
  caption: z.string().trim().max(2000).default(''),
  mediaIds: z.array(idSchema).min(1).max(MAX_POST_IMAGES),
  petIds: z.array(idSchema).min(1).max(MAX_PETS_PER_POST),
  // 장소 태그(선택, 1곳). ACTIVE 장소만 → 아니면 422 PLACE_NOT_USABLE
  placeId: idSchema.optional(),
})
export type CreatePostRequest = z.infer<typeof createPostRequestSchema>

// 게시물에 붙는 장소 요약. 장소가 숨김·폐업이면 null로 내려간다
export const postPlaceSchema = z.object({ id: idSchema, name: z.string(), category: placeCategorySchema })
export type PostPlace = z.infer<typeof postPlaceSchema>

export const postSchema = z.object({
  id: idSchema,
  author: userSummarySchema,
  caption: z.string(),
  images: z.array(z.object({ url: z.string(), thumbUrl: z.string() })),
  pets: z.array(z.object({ id: idSchema, name: z.string() })),
  place: postPlaceSchema.nullable(),
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  isLiked: z.boolean(),
  createdAt: z.string(),
})
export type Post = z.infer<typeof postSchema>

export const feedPageSchema = z.object({
  items: z.array(postSchema),
  nextCursor: idSchema.nullable(),
  fallback: z.literal('explore').optional(),
})
export type FeedPage = z.infer<typeof feedPageSchema>

// GET /feed/home, /feed/explore. excludeFollowing=true → 홈(팔로잉 ∪ 본인)이 소진된 뒤 이어 붙이는 "추천 게시물"(중복 방지)
export const feedQuerySchema = cursorQuerySchema.extend({
  excludeFollowing: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})
export type FeedQuery = z.infer<typeof feedQuerySchema>
export type FeedQueryInput = z.input<typeof feedQuerySchema>

// GET /users/:id/posts (17 프로필 그리드), GET /places/:id/posts (10 여기서 찍은 게시물)
export const postPageSchema = z.object({
  items: z.array(postSchema),
  nextCursor: idSchema.nullable(),
})
export type PostPage = z.infer<typeof postPageSchema>
