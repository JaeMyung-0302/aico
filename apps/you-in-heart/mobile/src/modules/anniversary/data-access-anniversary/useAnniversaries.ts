import { useQuery } from '@tanstack/react-query'
import { useSessionStatus } from '@/shared/auth/session'
import { useNow } from '@/shared/hooks/use-now'
import { anniversaryRange } from '../util-anniversary/anniversary-view'
import { fetchAnniversaries } from './anniversary-api'

export const ANNIVERSARIES_QUERY_KEY = ['anniversaries'] as const

const MINUTE_MS = 60_000

// 홈 다음 기념일·SCR-04 목록·위젯 스냅샷이 같은 캐시를 쓴다. 날짜가 바뀌면 범위(키)도 바뀐다
export const useAnniversaries = ({ isEnabled = true }: { isEnabled?: boolean } = {}) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  const { from, to } = anniversaryRange(useNow(MINUTE_MS))
  return useQuery({
    queryKey: [...ANNIVERSARIES_QUERY_KEY, from, to],
    queryFn: () => fetchAnniversaries({ from, to }),
    enabled: isSignedIn && isEnabled,
  })
}
