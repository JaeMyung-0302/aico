import type { CreatePlaceRequest } from '@you-in-heart/shared'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessionStatus } from '@/shared/auth/session'
import { createPlace, fetchPlace, fetchPlaceEntryPage, fetchPlaces } from './place-api'

export const PLACES_QUERY_KEY = ['places'] as const

const firstPage = (): string | undefined => undefined

// SCR-10 지도 핀 전체. 위치 동의가 꺼져 있으면 부르지 않는다(서버가 403)
export const usePlaces = ({ isEnabled }: { isEnabled: boolean }) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: PLACES_QUERY_KEY, queryFn: fetchPlaces, enabled: isSignedIn && isEnabled })
}

export const usePlace = (placeId: string, { isEnabled }: { isEnabled: boolean }) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({
    queryKey: [...PLACES_QUERY_KEY, placeId],
    queryFn: () => fetchPlace(placeId),
    enabled: isSignedIn && isEnabled,
  })
}

// 핀을 누르면 그곳의 기록 (최신순)
export const usePlaceEntries = (placeId: string | null) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useInfiniteQuery({
    queryKey: [...PLACES_QUERY_KEY, placeId ?? 'none', 'entries'],
    queryFn: ({ pageParam }) => fetchPlaceEntryPage({ placeId: placeId ?? '', cursor: pageParam }),
    initialPageParam: firstPage(),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isSignedIn && placeId !== null,
  })
}

// 새 핀 → 지도 목록을 다시 받는다
export const useCreatePlace = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePlaceRequest) => createPlace(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLACES_QUERY_KEY }),
  })
}
