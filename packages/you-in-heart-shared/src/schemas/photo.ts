import { z } from 'zod'
import {
  idSchema,
  isoDateTimeSchema,
  latSchema,
  lngSchema,
  signedUrlResponseSchema,
  uploadTargetSchema,
} from './common'

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

// GET /photos/:id/original — 저장할 때 확장자·형식을 고르도록 업로드 때 선언한 원본 mime을 함께 준다
export const photoOriginalResponseSchema = signedUrlResponseSchema.extend({ mime: originalMimeSchema })
export type PhotoOriginalResponse = z.infer<typeof photoOriginalResponseSchema>

// 목록·상세 응답: 원본 URL과 좌표는 넣지 않는다(원본은 GET /photos/:id/original 만)
export const photoSchema = z.object({
  id: idSchema,
  entryId: idSchema,
  // 올린 사람이 탈퇴하면 null
  uploaderId: idSchema.nullable(),
  status: photoStatusSchema,
  takenAt: isoDateTimeSchema.nullable(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  thumbUrl: z.url().nullable(),
  displayUrl: z.url().nullable(),
})
export type Photo = z.infer<typeof photoSchema>
