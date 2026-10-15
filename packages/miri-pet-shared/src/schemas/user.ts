import { z } from 'zod'
import { idSchema } from './common'

export const userRoleSchema = z.enum(['USER', 'ADMIN'])
export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED'])

export const nicknameSchema = z
  .string()
  .min(2)
  .max(20)
  .regex(/^[0-9A-Za-z가-힣._]+$/)

export const userSummarySchema = z.object({
  id: idSchema,
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
})
export type UserSummary = z.infer<typeof userSummarySchema>

export const userProfileSchema = userSummarySchema.extend({
  bio: z.string().nullable(),
  followerCount: z.number().int(),
  followingCount: z.number().int(),
  postCount: z.number().int(),
  isFollowing: z.boolean(),
})
export type UserProfile = z.infer<typeof userProfileSchema>

export const meSchema = userSummarySchema.extend({
  bio: z.string().nullable(),
  role: userRoleSchema,
  notifyVaccination: z.boolean(),
  notifySocial: z.boolean(),
  notifyDm: z.boolean(),
  // 필수 동의(REQUIRED_CONSENT_KINDS)를 모두 마쳤는지 → false면 02 Consent 화면으로
  hasRequiredConsents: z.boolean(),
})
export type Me = z.infer<typeof meSchema>

export const updateMeRequestSchema = z.object({
  nickname: nicknameSchema.optional(),
  bio: z.string().max(150).nullable().optional(),
  avatarMediaId: idSchema.nullable().optional(),
  notifyVaccination: z.boolean().optional(),
  notifySocial: z.boolean().optional(),
  notifyDm: z.boolean().optional(),
})
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>
