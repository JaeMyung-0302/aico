import { useQuery } from '@tanstack/react-query'
import { DIARY_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { fetchDiaryEntry } from './diary-api'

export const diaryEntryQueryKey = (id: string) => [...DIARY_QUERY_KEY, 'entry', id] as const

// SCR-06 상세·SCR-05 수정·SCR-09 뷰어(몇 번째 사진인지)가 같은 캐시를 쓴다
export const useDiaryEntry = (id: string | null) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({
    queryKey: diaryEntryQueryKey(id ?? ''),
    queryFn: () => fetchDiaryEntry(id ?? ''),
    enabled: isSignedIn && id !== null,
  })
}
