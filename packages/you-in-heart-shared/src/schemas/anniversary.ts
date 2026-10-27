import { z } from 'zod'
import { idSchema, isoDateSchema, userTextSchema } from './common'

// YEARLY·HUNDRED_DAYS는 Couple.startedOn에서 계산(저장 안 함), CUSTOM만 DB에 저장
export const anniversaryKindSchema = z.enum(['YEARLY', 'HUNDRED_DAYS', 'CUSTOM'])
export type AnniversaryKindValue = z.infer<typeof anniversaryKindSchema>

export const anniversaryTitleSchema = userTextSchema().min(1).max(30)

// POST /anniversaries
export const createCustomAnniversaryRequestSchema = z.object({
  title: anniversaryTitleSchema,
  date: isoDateSchema,
})
export type CreateCustomAnniversaryRequest = z.infer<typeof createCustomAnniversaryRequestSchema>

// PATCH /anniversaries/:id — :id는 uuid. 자동 기념일 id('auto:…')는 idSchema에서 400
export const updateCustomAnniversaryRequestSchema = createCustomAnniversaryRequestSchema.partial()
export type UpdateCustomAnniversaryRequest = z.infer<typeof updateCustomAnniversaryRequestSchema>

export const customAnniversarySchema = z.object({
  id: idSchema,
  title: z.string(),
  date: isoDateSchema,
})
export type CustomAnniversary = z.infer<typeof customAnniversarySchema>

// GET /anniversaries/custom — 수정 폼용 원래 날짜(목록 GET /anniversaries의 date는 해당 해의 날짜)
export const customAnniversaryListResponseSchema = z.object({ items: z.array(customAnniversarySchema) })
export type CustomAnniversaryListResponse = z.infer<typeof customAnniversaryListResponseSchema>

// GET /anniversaries 조회 범위 상한(일)
export const MAX_ANNIVERSARY_RANGE_DAYS = 3660

// GET /anniversaries?from&to (양끝 포함)
export const anniversaryRangeQuerySchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .refine(({ from, to }) => from <= to, { message: 'from은 to보다 늦을 수 없습니다', path: ['to'] })
export type AnniversaryRangeQuery = z.infer<typeof anniversaryRangeQuerySchema>

// 목록 항목 = shared computeAnniversaries 결과와 같은 모양
export const anniversaryItemSchema = z.object({
  id: z.string(),
  refKey: z.string(),
  kind: anniversaryKindSchema,
  title: z.string(),
  date: isoDateSchema,
})
export type AnniversaryItem = z.infer<typeof anniversaryItemSchema>

export const anniversaryListResponseSchema = z.object({ items: z.array(anniversaryItemSchema) })
export type AnniversaryListResponse = z.infer<typeof anniversaryListResponseSchema>
