import { MAX_UPLOAD_BYTES } from '../constants/limits'
import { z } from 'zod'
import { idSchema } from './common'

export const mediaPurposeSchema = z.enum(['POST', 'AVATAR', 'DM', 'CERTIFICATE', 'PLACE_REPORT'])
export const mediaStatusSchema = z.enum(['PENDING', 'READY', 'REJECTED'])
// HEIC/HEIF는 받지 않는다(서버 디코더 공격면 축소). 앱은 expo-image-manipulator로 JPEG 변환 후 image/jpeg로 올린다
export const mediaMimeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp'])

export const createUploadRequestSchema = z.object({
  purpose: mediaPurposeSchema,
  mime: mediaMimeSchema,
  bytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES),
})
export type CreateUploadRequest = z.infer<typeof createUploadRequestSchema>

export const createUploadResponseSchema = z.object({
  mediaId: idSchema,
  uploadUrl: z.string(),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string(),
})
export type CreateUploadResponse = z.infer<typeof createUploadResponseSchema>

export const mediaSchema = z.object({
  id: idSchema,
  status: mediaStatusSchema,
  url: z.string().nullable(),
  thumbUrl: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
})
export type Media = z.infer<typeof mediaSchema>
