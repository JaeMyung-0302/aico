import { z } from 'zod'
import { idSchema } from './common'
import { petSizeSchema } from './pet'

export const placeCategorySchema = z.enum(['CAFE', 'RESTAURANT', 'PARK', 'ACCOMMODATION', 'HOSPITAL', 'ETC'])
export const placeSourceSchema = z.enum(['PUBLIC_DATA', 'TOUR_API', 'KAKAO', 'USER'])

const latSchema = z.coerce.number().min(-90).max(90)

// 허용 크기: S·M·L 중 1~3개, 중복 없이
const allowedSizesSchema = z
  .array(petSizeSchema)
  .min(1)
  .max(3)
  .refine((sizes) => new Set(sizes).size === sizes.length, { message: '크기가 중복됐어요' })
const lngSchema = z.coerce.number().min(-180).max(180)

export const placeBboxQuerySchema = z.object({
  swLat: latSchema,
  swLng: lngSchema,
  neLat: latSchema,
  neLng: lngSchema,
  category: placeCategorySchema.optional(),
  size: petSizeSchema.optional(),
  indoor: z.stringbool().optional(),
  // distance = bbox 중심 기준 거리순(목록 모드). 기기 좌표는 받지 않는다(D4)
  sort: z.enum(['distance']).optional(),
})
export type PlaceBboxQuery = z.infer<typeof placeBboxQuerySchema>

export const placeSchema = z.object({
  id: idSchema,
  name: z.string(),
  category: placeCategorySchema,
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  allowedSizes: z.array(petSizeSchema),
  indoorAllowed: z.boolean(),
  conditionsNote: z.string().nullable(),
  source: placeSourceSchema,
  verifiedAt: z.string().nullable(),
})
export type Place = z.infer<typeof placeSchema>

export const placeReportRequestSchema = z.object({
  placeId: idSchema.nullable(),
  name: z.string().trim().min(1).max(60),
  address: z.string().trim().min(1).max(200),
  category: placeCategorySchema,
  allowedSizes: allowedSizesSchema,
  indoorAllowed: z.boolean(),
  note: z.string().trim().max(500).optional(),
})
export type PlaceReportRequest = z.infer<typeof placeReportRequestSchema>

export const placeStatusSchema = z.enum(['ACTIVE', 'HIDDEN', 'CLOSED'])

// GET /places 응답. isTruncated = 300건 상한에 걸려 잘렸음(지도를 더 확대하라는 안내용)
export const placeListSchema = z.object({
  items: z.array(placeSchema),
  isTruncated: z.boolean(),
})
export type PlaceList = z.infer<typeof placeListSchema>

const placeFieldsSchema = {
  name: z.string().trim().min(1).max(60),
  address: z.string().trim().min(1).max(200),
  category: placeCategorySchema,
  allowedSizes: allowedSizesSchema,
  indoorAllowed: z.boolean(),
  conditionsNote: z.string().trim().max(300).optional(),
}
const reportNoteSchema = z.string().trim().max(500).optional()
// 안내문 사진(선택): PLACE_REPORT 용도 내 READY 이미지, 최대 3장·중복 없이. payload가 아닌 PlaceReportImage에 저장된다
export const MAX_PLACE_REPORT_IMAGES = 3
const reportMediaIdsSchema = z
  .array(idSchema)
  .max(MAX_PLACE_REPORT_IMAGES)
  .refine((ids) => new Set(ids).size === ids.length, { message: '같은 사진이 중복됐어요' })
  .optional()

// POST /places/reports. NEW 좌표는 사용자가 지도에서 고른 위치(기기 GPS 아님)
export const createPlaceReportRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('NEW'),
    ...placeFieldsSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    note: reportNoteSchema,
    mediaIds: reportMediaIdsSchema,
  }),
  z.object({
    kind: z.literal('EDIT'),
    placeId: idSchema,
    ...z.object(placeFieldsSchema).partial().shape,
    note: reportNoteSchema,
    mediaIds: reportMediaIdsSchema,
  }),
  z.object({ kind: z.literal('CLOSED'), placeId: idSchema, note: reportNoteSchema, mediaIds: reportMediaIdsSchema }),
])
export type CreatePlaceReportRequest = z.infer<typeof createPlaceReportRequestSchema>
export const placeReportKindSchema = z.enum(['NEW', 'EDIT', 'CLOSED'])
export type PlaceReportKind = z.infer<typeof placeReportKindSchema>

export const placeReportStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

// GET /me/place-reports 항목
export const myPlaceReportSchema = z.object({
  id: idSchema,
  kind: placeReportKindSchema,
  placeId: idSchema.nullable(),
  placeName: z.string(),
  status: placeReportStatusSchema,
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
})
export type MyPlaceReport = z.infer<typeof myPlaceReportSchema>
export const myPlaceReportListSchema = z.object({ items: z.array(myPlaceReportSchema) })

// GET /config (원격 기능 플래그)
export const appConfigSchema = z.object({ isGpsEnabled: z.boolean() })
export type AppConfig = z.infer<typeof appConfigSchema>
