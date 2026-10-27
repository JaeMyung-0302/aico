import { z } from 'zod'
import { idSchema, isoDateTimeSchema, latSchema, lngSchema, userTextSchema } from './common'

const MAX_PLACE_NAME_LENGTH = 50
const MAX_ADDRESS_LENGTH = 200

export const placeSchema = z.object({
  id: idSchema,
  name: z.string(),
  lat: latSchema,
  lng: lngSchema,
  kakaoPlaceId: z.string().nullable(),
  address: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})
export type Place = z.infer<typeof placeSchema>

// POST /places — 사용자가 핀 제안을 확인한 뒤에만 호출
export const createPlaceRequestSchema = z.object({
  name: userTextSchema().min(1).max(MAX_PLACE_NAME_LENGTH),
  lat: latSchema,
  lng: lngSchema,
  kakaoPlaceId: z.string().max(50).optional(),
  address: z.string().max(MAX_ADDRESS_LENGTH).optional(),
})
export type CreatePlaceRequest = z.infer<typeof createPlaceRequestSchema>

// PATCH /places/:id
export const updatePlaceRequestSchema = createPlaceRequestSchema.partial()
export type UpdatePlaceRequest = z.infer<typeof updatePlaceRequestSchema>

export type Bbox = { minLng: number; minLat: number; maxLng: number; maxLat: number }

// GET /places?bbox=minLng,minLat,maxLng,maxLat
export const placeBboxQuerySchema = z.object({
  bbox: z
    .string()
    .transform((raw, ctx): Bbox => {
      const parts = raw.split(',').map((part) => Number(part.trim()))
      const [minLng, minLat, maxLng, maxLat] = parts
      const isValid =
        parts.length === 4 &&
        minLng !== undefined &&
        minLat !== undefined &&
        maxLng !== undefined &&
        maxLat !== undefined &&
        parts.every(Number.isFinite) &&
        minLng >= -180 &&
        maxLng <= 180 &&
        minLat >= -90 &&
        maxLat <= 90 &&
        minLng <= maxLng &&
        minLat <= maxLat
      if (!isValid) {
        ctx.addIssue({ code: 'custom', message: 'bbox는 minLng,minLat,maxLng,maxLat 형식이어야 합니다' })
        return z.NEVER
      }
      return { minLng, minLat, maxLng, maxLat }
    })
    .optional(),
})
export type PlaceBboxQuery = z.infer<typeof placeBboxQuerySchema>

// GET /places/search?q= (카카오 로컬 키워드 검색 프록시, 검색어는 로그 금지)
export const placeSearchQuerySchema = z.object({ q: z.string().trim().min(1).max(100) })
export type PlaceSearchQuery = z.infer<typeof placeSearchQuerySchema>

export const placeSearchResultSchema = z.object({
  kakaoPlaceId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  lat: latSchema,
  lng: lngSchema,
})
export type PlaceSearchResult = z.infer<typeof placeSearchResultSchema>

export const placeSearchResponseSchema = z.object({ items: z.array(placeSearchResultSchema) })
export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>

// GET /places/reverse?lat&lng
export const placeReverseQuerySchema = z.object({
  lat: z.coerce.number().pipe(latSchema),
  lng: z.coerce.number().pipe(lngSchema),
})
export type PlaceReverseQuery = z.infer<typeof placeReverseQuerySchema>

export const placeReverseResponseSchema = z.object({ address: z.string().nullable() })
export type PlaceReverseResponse = z.infer<typeof placeReverseResponseSchema>
