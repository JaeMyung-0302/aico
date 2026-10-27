import { z } from 'zod'
import { cursorPage, cursorQuerySchema, idSchema, isoDateSchema, isoDateTimeSchema, userTextSchema } from './common'
import { photoSchema } from './photo'

export const diaryKindSchema = z.enum(['MANUAL', 'AUTO_DAY'])
export type DiaryKind = z.infer<typeof diaryKindSchema>

const MAX_DIARY_TITLE_LENGTH = 60
const MAX_DIARY_BODY_LENGTH = 5000
const MAX_AUTO_DAYS_PER_REQUEST = 366

// POST /diary
export const createDiaryRequestSchema = z.object({
  happenedOn: isoDateSchema,
  title: userTextSchema().min(1).max(MAX_DIARY_TITLE_LENGTH).optional(),
  body: userTextSchema().max(MAX_DIARY_BODY_LENGTH),
})
export type CreateDiaryRequest = z.infer<typeof createDiaryRequestSchema>

// PATCH /diary/:id — 작성자만. placeId null이면 장소 연결 해제
export const updateDiaryRequestSchema = z.object({
  happenedOn: isoDateSchema.optional(),
  title: userTextSchema().min(1).max(MAX_DIARY_TITLE_LENGTH).nullable().optional(),
  body: userTextSchema().max(MAX_DIARY_BODY_LENGTH).optional(),
  placeId: idSchema.nullable().optional(),
})
export type UpdateDiaryRequest = z.infer<typeof updateDiaryRequestSchema>

// GET /diary?cursor&before=YYYY-MM-DD (happenedOn desc, id desc)
export const diaryListQuerySchema = cursorQuerySchema.extend({
  before: isoDateSchema.optional(),
})
export type DiaryListQuery = z.infer<typeof diaryListQuerySchema>

// POST /diary/auto-days — 날짜별 AUTO_DAY 엔트리 멱등 생성
export const createAutoDaysRequestSchema = z.object({
  dates: z.array(isoDateSchema).min(1).max(MAX_AUTO_DAYS_PER_REQUEST),
})
export type CreateAutoDaysRequest = z.infer<typeof createAutoDaysRequestSchema>

export const createAutoDaysResponseSchema = z.object({
  entries: z.array(z.object({ id: idSchema, happenedOn: isoDateSchema })),
})
export type CreateAutoDaysResponse = z.infer<typeof createAutoDaysResponseSchema>

export const diaryEntrySchema = z.object({
  id: idSchema,
  kind: diaryKindSchema,
  // 작성자가 탈퇴하면 null(상대가 30일 동안 내보낼 수 있게 기록은 남긴다)
  authorId: idSchema.nullable(),
  happenedOn: isoDateSchema,
  title: z.string().nullable(),
  body: z.string(),
  placeId: idSchema.nullable(),
  photos: z.array(photoSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type DiaryEntry = z.infer<typeof diaryEntrySchema>

// GET /diary 응답
export const diaryListResponseSchema = cursorPage(diaryEntrySchema)
export type DiaryListResponse = z.infer<typeof diaryListResponseSchema>
