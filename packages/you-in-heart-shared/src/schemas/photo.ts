import { z } from 'zod'
import { MAX_DISPLAY_CANDIDATE_BYTES } from '../constants/limits'
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

// 표시용 후보 PUT의 Content-Length(서명에 들어간다). 기기가 만든 JPEG의 실제 바이트 수
const displayBytesSchema = z.number().int().min(1).max(MAX_DISPLAY_CANDIDATE_BYTES)

// POST /photos/uploads — takenAt 미래 여부·엔트리당 장수(MAX_PHOTOS_PER_ENTRY)는 서버가 검사
export const createPhotoUploadRequestSchema = z
  .object({
    entryId: idSchema,
    originalMime: originalMimeSchema,
    originalBytes: z.number().int().positive(),
    displayBytes: displayBytesSchema,
    takenAt: isoDateTimeSchema.optional(),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
  })
  .refine(({ lat, lng }) => (lat === undefined) === (lng === undefined), {
    message: 'lat과 lng는 함께 보내야 합니다',
    path: ['lng'],
  })
export type CreatePhotoUploadRequest = z.infer<typeof createPhotoUploadRequestSchema>

// POST /photos/:id/uploads/renew — 표시용 후보는 다시 만들 수 있어 바이트 수를 새로 받는다(원본은 처음 선언 그대로)
export const renewPhotoUploadRequestSchema = z.object({ displayBytes: displayBytesSchema })
export type RenewPhotoUploadRequest = z.infer<typeof renewPhotoUploadRequestSchema>

// original·display 모두 headers(Content-Type·Content-Length)를 그대로 붙여 PUT해야 한다
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
