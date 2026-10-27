import { z } from 'zod'
import { idSchema, isoDateTimeSchema, latSchema, lngSchema, uploadTargetSchema } from './common'

// 원본은 바이트 그대로 보관(EXIF 포함). 서버는 앞 16바이트 매직 넘버만 검사
export const originalMimeSchema = z.enum(['image/jpeg', 'image/heic', 'image/heif', 'image/png'])
export type OriginalMime = z.infer<typeof originalMimeSchema>

export const photoStatusSchema = z.enum(['PENDING', 'READY'])
export type PhotoStatus = z.infer<typeof photoStatusSchema>

// POST /photos/uploads — takenAt 미래 여부·엔트리당 장수(MAX_PHOTOS_PER_ENTRY)는 서버가 검사
export const createPhotoUploadRequestSchema = z
  .object({
    entryId: idSchema,
    originalMime: originalMimeSchema,
    originalBytes: z.number().int().positive(),
    takenAt: isoDateTimeSchema.optional(),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
  })
  .refine(({ lat, lng }) => (lat === undefined) === (lng === undefined), {
    message: 'lat과 lng는 함께 보내야 합니다',
    path: ['lng'],
  })
export type CreatePhotoUploadRequest = z.infer<typeof createPhotoUploadRequestSchema>

export const createPhotoUploadResponseSchema = z.object({
  photoId: idSchema,
  original: uploadTargetSchema,
  display: uploadTargetSchema,
  expiresIn: z.number().int().positive(),
})
export type CreatePhotoUploadResponse = z.infer<typeof createPhotoUploadResponseSchema>

// 목록·상세 응답: 원본 URL과 좌표는 넣지 않는다(원본은 GET /photos/:id/original 만)
export const photoSchema = z.object({
  id: idSchema,
  entryId: idSchema,
  uploaderId: idSchema,
  status: photoStatusSchema,
  takenAt: isoDateTimeSchema.nullable(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  thumbUrl: z.url().nullable(),
  displayUrl: z.url().nullable(),
})
export type Photo = z.infer<typeof photoSchema>
