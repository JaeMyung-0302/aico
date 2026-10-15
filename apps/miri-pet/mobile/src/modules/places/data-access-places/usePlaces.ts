import type { CreatePlaceReportRequest } from '@miri-pet/shared'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPlaceReport,
  fetchAppConfig,
  fetchMyPlaceReports,
  fetchPlace,
  fetchPlaces,
  type PlacesQuery,
} from './places-api'

export const PLACES_QUERY_KEY = ['places'] as const
const MY_PLACE_REPORTS_QUERY_KEY = ['me', 'place-reports'] as const
const APP_CONFIG_QUERY_KEY = ['config'] as const
const CONFIG_STALE_MS = 10 * 60 * 1000

// 필터·지역을 바꾸는 동안 이전 결과를 유지해 지도 마커가 깜빡이지 않게 한다
export const usePlaces = (query: PlacesQuery) =>
  useQuery({
    queryKey: [...PLACES_QUERY_KEY, 'list', query],
    queryFn: () => fetchPlaces(query),
    placeholderData: keepPreviousData,
  })

export const usePlace = (placeId: string | undefined) =>
  useQuery({
    queryKey: [...PLACES_QUERY_KEY, 'detail', placeId],
    queryFn: () => fetchPlace(placeId ?? ''),
    enabled: Boolean(placeId),
  })

export const useAppConfig = () =>
  useQuery({ queryKey: APP_CONFIG_QUERY_KEY, queryFn: fetchAppConfig, staleTime: CONFIG_STALE_MS })

export const useMyPlaceReports = () => useQuery({ queryKey: MY_PLACE_REPORTS_QUERY_KEY, queryFn: fetchMyPlaceReports })

export const useCreatePlaceReport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreatePlaceReportRequest) => createPlaceReport(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_PLACE_REPORTS_QUERY_KEY }),
  })
}
