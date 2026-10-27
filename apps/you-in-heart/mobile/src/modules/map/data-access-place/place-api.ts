import {
  type CreatePlaceRequest,
  type DiaryListResponse,
  diaryListResponseSchema,
  type Place,
  placeListResponseSchema,
  placeReverseResponseSchema,
  placeSchema,
  type PlaceSearchResult,
  placeSearchResponseSchema,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// 장소 API 는 LOCATION 동의가 있어야 한다(없으면 403 LOCATION_CONSENT_REQUIRED). 검색어·좌표는 로그에 남기지 않는다

// GET /places — 커플 핀은 수백 개라 bbox 없이 전부 받는다
export const fetchPlaces = async (): Promise<Place[]> => {
  const { items } = await requestApi({ method: 'GET', url: '/places', schema: placeListResponseSchema })
  return items
}

export const fetchPlace = (placeId: string): Promise<Place> =>
  requestApi({ method: 'GET', url: `/places/${encodeURIComponent(placeId)}`, schema: placeSchema })

// 카카오 키워드 검색 프록시 (역지오코딩과 합쳐 분당 30회)
export const searchPlaces = async (q: string): Promise<PlaceSearchResult[]> => {
  const { items } = await requestApi({
    method: 'GET',
    url: '/places/search',
    params: { q },
    schema: placeSearchResponseSchema,
  })
  return items
}

export const reversePlace = async ({ lat, lng }: { lat: number; lng: number }): Promise<string | null> => {
  const { address } = await requestApi({
    method: 'GET',
    url: '/places/reverse',
    params: { lat, lng },
    schema: placeReverseResponseSchema,
  })
  return address
}

// 사용자가 확인한 뒤에만 부른다 (핀 제안 확인·검색 결과 선택)
export const createPlace = (body: CreatePlaceRequest): Promise<Place> =>
  requestApi({ method: 'POST', url: '/places', data: body, schema: placeSchema })

// 핀에 이어진 기록 (동의 없이도 읽을 수 있다)
export const fetchPlaceEntryPage = ({ placeId, cursor }: { placeId: string; cursor?: string }): Promise<DiaryListResponse> =>
  requestApi({
    method: 'GET',
    url: `/places/${encodeURIComponent(placeId)}/entries`,
    params: cursor ? { cursor } : {},
    schema: diaryListResponseSchema,
  })
