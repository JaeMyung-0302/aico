import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSessionStatus } from '@/shared/auth/session'
import { PLACES_QUERY_KEY } from './usePlaces'
import { searchPlaces } from './place-api'

const DEBOUNCE_MS = 300
const MAX_QUERY_LENGTH = 100

// 입력이 멈춘 뒤 0.3초에 검색한다(분당 30회 제한). 빈 검색어는 보내지 않는다
export const usePlaceSearch = (query: string) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim().slice(0, MAX_QUERY_LENGTH)), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])
  return useQuery({
    queryKey: [...PLACES_QUERY_KEY, 'search', debounced],
    queryFn: () => searchPlaces(debounced),
    enabled: isSignedIn && debounced !== '',
    staleTime: 60_000,
  })
}
