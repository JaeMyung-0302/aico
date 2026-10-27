import { z } from 'zod'
import { idSchema, userTextSchema } from './common'
import { coupleSummarySchema } from './couple'

export const userStatusSchema = z.enum(['ACTIVE', 'DELETED'])
export type UserStatus = z.infer<typeof userStatusSchema>

export const displayNameSchema = userTextSchema().min(1).max(20)

// PATCH /me
export const updateMeRequestSchema = z.object({
  displayName: displayNameSchema,
})
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>

export const consentTypeSchema = z.enum(['TERMS', 'PRIVACY', 'LOCATION'])
export type ConsentType = z.infer<typeof consentTypeSchema>

// PUT /me/consents — 전체 상태를 보낸다. TERMS·PRIVACY는 필수(true만 허용), LOCATION은 선택
export const putConsentsRequestSchema = z.object({
  terms: z.literal(true),
  privacy: z.literal(true),
  location: z.boolean(),
})
export type PutConsentsRequest = z.infer<typeof putConsentsRequestSchema>

export const consentsSchema = z.object({
  terms: z.boolean(),
  privacy: z.boolean(),
  location: z.boolean(),
})
export type Consents = z.infer<typeof consentsSchema>

// GET /me — 미입력 displayName은 null(온보딩), 미연결이면 couple null
export const meResponseSchema = z.object({
  id: idSchema,
  displayName: z.string().nullable(),
  consents: consentsSchema,
  couple: coupleSummarySchema.nullable(),
})
export type MeResponse = z.infer<typeof meResponseSchema>

// POST /me/push-tokens, DELETE /me/push-tokens/:token
export const pushPlatformSchema = z.enum(['ios', 'android'])
export const registerPushTokenRequestSchema = z.object({
  token: z.string().min(1).max(200),
  platform: pushPlatformSchema,
})
export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>
