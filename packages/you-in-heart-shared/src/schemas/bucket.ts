import { z } from 'zod'
import { idSchema, isoDateTimeSchema, userTextSchema } from './common'

export const bucketItemTitleSchema = userTextSchema().min(1).max(60)

export const bucketItemSchema = z.object({
  id: idSchema,
  title: z.string(),
  doneAt: isoDateTimeSchema.nullable(),
  entryId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
})
export type BucketItem = z.infer<typeof bucketItemSchema>

// POST /bucket
export const createBucketItemRequestSchema = z.object({ title: bucketItemTitleSchema })
export type CreateBucketItemRequest = z.infer<typeof createBucketItemRequestSchema>

// PATCH /bucket/:id — done=true면 완료(entryId는 같은 커플 일기만), done=false면 완료 취소(entryId 해제)
export const updateBucketItemRequestSchema = z
  .object({
    title: bucketItemTitleSchema.optional(),
    done: z.boolean().optional(),
    entryId: idSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: '변경할 항목이 없습니다',
  })
export type UpdateBucketItemRequest = z.infer<typeof updateBucketItemRequestSchema>
