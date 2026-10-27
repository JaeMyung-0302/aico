import { z } from 'zod'
import { anniversaryItemSchema } from './anniversary'
import { bucketItemSchema } from './bucket'
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common'
import { placeSchema } from './place'
import { quoteSchema } from './quote'

export const exportJobStatusSchema = z.enum(['PENDING', 'RUNNING', 'READY', 'FAILED'])
export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>

// POST /export, GET /export/:jobId — READY이면 24시간 서명 URL
export const exportJobSchema = z.object({
  id: idSchema,
  status: exportJobStatusSchema,
  createdAt: isoDateTimeSchema,
  downloadUrl: z.url().nullable(),
  expiresAt: isoDateTimeSchema.nullable(),
})
export type ExportJob = z.infer<typeof exportJobSchema>

// GET /export — 가장 최근 작업(앱 재시작 뒤 진행 상태 복원용). 없으면 null
export const latestExportResponseSchema = z.object({ job: exportJobSchema.nullable() })
export type LatestExportResponse = z.infer<typeof latestExportResponseSchema>

// zip 안의 entries.json. 사진 원본은 photos/{happenedOn}/{photoId}.{ext}
export const exportManifestV1Schema = z.object({
  v: z.literal(1),
  exportedAt: isoDateTimeSchema,
  couple: z.object({ startedOn: isoDateSchema.nullable(), names: z.array(z.string()) }),
  diary: z.array(
    z.object({
      id: idSchema,
      kind: z.enum(['MANUAL', 'AUTO_DAY']),
      happenedOn: isoDateSchema,
      title: z.string().nullable(),
      body: z.string(),
      placeId: idSchema.nullable(),
      photos: z.array(z.object({ id: idSchema, path: z.string(), takenAt: isoDateTimeSchema.nullable() })),
    }),
  ),
  anniversaries: z.array(anniversaryItemSchema),
  places: z.array(placeSchema),
  bucket: z.array(bucketItemSchema),
  quotes: z.array(quoteSchema.omit({ screenshotUrl: true, screenshotThumbUrl: true })),
})
export type ExportManifestV1 = z.infer<typeof exportManifestV1Schema>
