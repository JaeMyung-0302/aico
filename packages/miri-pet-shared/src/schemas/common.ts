import { z } from 'zod'

// 모든 id는 uuid v7 (시간순 정렬 가능) → id 하나로 커서 페이지네이션
export const idSchema = z.uuid()

// 공백 + 제로폭 문자(ZWSP·ZWNJ·ZWJ·WORD JOINER·BOM). 가운데(이모지 ZWJ 등)는 건드리지 않는다
const EDGE_BLANKS = /^[\s\u200B-\u200D\u2060\uFEFF]+|[\s\u200B-\u200D\u2060\uFEFF]+$/g
export const trimBlankEdges = (value: string): string => value.replace(EDGE_BLANKS, '')

// 사용자 글(댓글·캡션): 보이지 않는 문자만 있는 글은 빈 글로 본다
export const userTextSchema = () => z.string().overwrite(trimBlankEdges)

export const cursorQuerySchema = z.object({
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type CursorQuery = z.infer<typeof cursorQuerySchema>

export const cursorPage = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: idSchema.nullable(),
  })
export type CursorPage<T> = { items: T[]; nextCursor: string | null }

export const apiErrorBodySchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  requestId: z.string().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export const isoDateSchema = z.iso.date()
export const isoDateTimeSchema = z.iso.datetime()
