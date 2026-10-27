import { z } from 'zod'
import { MAX_QUOTES_PER_BULK } from '../constants/limits'
import { cursorPage, idSchema, isoDateTimeSchema, uploadTargetSchema, userTextSchema } from './common'

export const quoteSourceSchema = z.enum(['SHARE', 'TXT', 'SCREENSHOT'])
export type QuoteSource = z.infer<typeof quoteSourceSchema>

const quoteTextSchema = userTextSchema().min(1).max(2000)
const speakerLabelSchema = userTextSchema().min(1).max(50)
const quoteMemoSchema = userTextSchema().max(500)

// 원문 txt는 기기에서 파싱하고 선택한 줄만 보낸다(본문 64KB 초과는 서버가 413)
const quoteItemSchema = z.object({
  text: quoteTextSchema,
  speakerLabel: speakerLabelSchema.optional(),
  saidAt: isoDateTimeSchema.optional(),
  memo: quoteMemoSchema.optional(),
})

// POST /quotes — 텍스트 문구만(SCREENSHOT은 업로드 경로 사용)
export const createQuoteRequestSchema = quoteItemSchema.extend({
  source: z.enum(['SHARE', 'TXT']),
})
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>

// POST /quotes/bulk — source는 TXT로 저장
export const bulkCreateQuotesRequestSchema = z.object({
  items: z.array(quoteItemSchema).min(1).max(MAX_QUOTES_PER_BULK),
})
export type BulkCreateQuotesRequest = z.infer<typeof bulkCreateQuotesRequestSchema>

export const bulkCreateQuotesResponseSchema = z.object({ created: z.number().int().nonnegative() })
export type BulkCreateQuotesResponse = z.infer<typeof bulkCreateQuotesResponseSchema>

// POST /quotes/screenshots/uploads → PUT → POST /quotes/:id/screenshot/complete
export const screenshotMimeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])
export const createScreenshotUploadRequestSchema = z.object({
  mime: screenshotMimeSchema,
  bytes: z.number().int().positive(),
  memo: quoteMemoSchema.optional(),
})
export type CreateScreenshotUploadRequest = z.infer<typeof createScreenshotUploadRequestSchema>

export const createScreenshotUploadResponseSchema = z.object({
  quoteId: idSchema,
  upload: uploadTargetSchema,
  expiresIn: z.number().int().positive(),
})
export type CreateScreenshotUploadResponse = z.infer<typeof createScreenshotUploadResponseSchema>

// PATCH /quotes/:id
export const updateQuoteRequestSchema = z.object({
  speakerLabel: speakerLabelSchema.nullable().optional(),
  memo: quoteMemoSchema.nullable().optional(),
})
export type UpdateQuoteRequest = z.infer<typeof updateQuoteRequestSchema>

// 응답: DB의 screenshotKey·screenshotThumbKey 대신 서명 URL
export const quoteSchema = z.object({
  id: idSchema,
  source: quoteSourceSchema,
  text: z.string().nullable(),
  speakerLabel: z.string().nullable(),
  saidAt: isoDateTimeSchema.nullable(),
  memo: z.string().nullable(),
  screenshotUrl: z.url().nullable(),
  screenshotThumbUrl: z.url().nullable(),
  createdAt: isoDateTimeSchema,
})
export type Quote = z.infer<typeof quoteSchema>

// GET /quotes?cursor&limit 응답(최신순). 업로드가 끝나지 않은 스크린샷 문구는 빠진다
export const quoteListResponseSchema = cursorPage(quoteSchema)
export type QuoteListResponse = z.infer<typeof quoteListResponseSchema>
