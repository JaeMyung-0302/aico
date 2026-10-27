import { z } from 'zod'
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '../constants/limits'
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common'

export const coupleStatusSchema = z.enum(['ACTIVE', 'UNLINKING'])
export type CoupleStatus = z.infer<typeof coupleStatusSchema>

const INVITE_CODE_PATTERN = new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`)

// 입력은 공백 제거 + 대문자 정규화 후 검사
export const inviteCodeSchema = z.string().trim().toUpperCase().regex(INVITE_CODE_PATTERN)

// POST /couples/invites
export const createInviteResponseSchema = z.object({
  code: inviteCodeSchema,
  expiresAt: isoDateTimeSchema,
})
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>

// POST /couples/join — 실패는 모두 404 "코드를 확인해 주세요"
export const joinCoupleRequestSchema = z.object({
  code: inviteCodeSchema,
})
export type JoinCoupleRequest = z.infer<typeof joinCoupleRequestSchema>

// PATCH /couples/me
export const updateCoupleRequestSchema = z.object({
  startedOn: isoDateSchema,
})
export type UpdateCoupleRequest = z.infer<typeof updateCoupleRequestSchema>

export const coupleMemberSlotSchema = z.union([z.literal(1), z.literal(2)])

export const coupleMemberSchema = z.object({
  userId: idSchema,
  displayName: z.string().nullable(),
  slot: coupleMemberSlotSchema,
  reconnectConfirmedAt: isoDateTimeSchema.nullable(),
})
export type CoupleMember = z.infer<typeof coupleMemberSchema>

// GET /couples/me, POST /couples/join, POST /couples/me/unlink, POST /couples/me/reconnect 응답
export const coupleSchema = z.object({
  id: idSchema,
  status: coupleStatusSchema,
  startedOn: isoDateSchema.nullable(),
  members: z.array(coupleMemberSchema).length(2),
  unlinkRequestedAt: isoDateTimeSchema.nullable(),
  unlinkRequestedBy: idSchema.nullable(),
  purgeAfter: isoDateTimeSchema.nullable(),
})
export type Couple = z.infer<typeof coupleSchema>

// GET /me 안의 요약
export const coupleSummarySchema = coupleSchema.pick({ id: true, status: true, startedOn: true, purgeAfter: true })
export type CoupleSummary = z.infer<typeof coupleSummarySchema>
