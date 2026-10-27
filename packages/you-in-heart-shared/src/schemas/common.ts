import { z } from 'zod'

// 모든 id는 uuid v7 (시간순 정렬 가능) → id 하나로 커서 페이지네이션
export const idSchema = z.uuid()

// 날짜는 KST 기준 'YYYY-MM-DD', 시각은 ISO 8601(UTC 'Z' 또는 오프셋)
export const isoDateSchema = z.iso.date()
export const isoDateTimeSchema = z.iso.datetime({ offset: true })

// 공백 + 제로폭 문자(ZWSP·ZWNJ·ZWJ·WORD JOINER·BOM). 가운데(이모지 ZWJ 등)는 건드리지 않는다
const EDGE_BLANKS = /^[\s​-‍⁠﻿]+|[\s​-‍⁠﻿]+$/g
export const trimBlankEdges = (value: string): string => value.replace(EDGE_BLANKS, '')

// 사용자 글(제목·이름·본문): 보이지 않는 문자만 있는 글은 빈 글로 본다
export const userTextSchema = () => z.string().overwrite(trimBlankEdges)

export const latSchema = z.number().min(-90).max(90)
export const lngSchema = z.number().min(-180).max(180)

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

// presigned PUT 대상. headers(Content-Type·Content-Length)를 그대로 붙여 보내야 서명이 맞는다
export const uploadTargetSchema = z.object({
  url: z.url(),
  headers: z.record(z.string(), z.string()),
})
export type UploadTarget = z.infer<typeof uploadTargetSchema>

export const signedUrlResponseSchema = z.object({
  url: z.url(),
  expiresIn: z.number().int().positive(),
})
export type SignedUrlResponse = z.infer<typeof signedUrlResponseSchema>

export const apiErrorBodySchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  // 상태 코드만으로 구분이 안 되는 경우의 분류 (예: 403 CONSENT_REQUIRED, LOCATION_CONSENT_REQUIRED)
  code: z.string().optional(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  requestId: z.string().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
