import {
  type AppConfig,
  appConfigSchema,
  type CreatePlaceReportRequest,
  type MyPlaceReport,
  myPlaceReportListSchema,
  type Place,
  type PlaceList,
  placeListSchema,
  placeSchema,
} from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { buildPlaceQueryParams, type MapBbox, type PlaceFilterValue, type PlaceSort } from '../util-place-query'

export type PlacesQuery = { bbox: MapBbox; filters: PlaceFilterValue; sort?: PlaceSort }

export const fetchPlaces = ({ bbox, filters, sort }: PlacesQuery): Promise<PlaceList> =>
  requestApi({
    method: 'GET',
    url: '/places',
    params: buildPlaceQueryParams(bbox, filters, sort),
    schema: placeListSchema,
  })

export const fetchPlace = (placeId: string): Promise<Place> =>
  requestApi({ method: 'GET', url: `/places/${placeId}`, schema: placeSchema })

// 서버 응답 201 { id, status } — 화면은 성공 여부만 쓴다
export const createPlaceReport = (request: CreatePlaceReportRequest): Promise<void> =>
  requestApi({ method: 'POST', url: '/places/reports', data: request })

export const fetchMyPlaceReports = async (): Promise<MyPlaceReport[]> => {
  const { items } = await requestApi({ method: 'GET', url: '/me/place-reports', schema: myPlaceReportListSchema })
  return items
}

export const fetchAppConfig = (): Promise<AppConfig> =>
  requestApi({ method: 'GET', url: '/config', schema: appConfigSchema })
