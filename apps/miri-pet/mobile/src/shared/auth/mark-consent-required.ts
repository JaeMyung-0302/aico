import type { Me } from '@miri-pet/shared'
import type { QueryClient } from '@tanstack/react-query'
import { ME_QUERY_KEY } from './query-keys'

// 서버가 403 CONSENT_REQUIRED를 주면 /me 캐시를 "동의 필요"로 바꾸고 다시 받는다
// → 인증 게이트(resolveAuthRedirect)가 /consent로 보낸다. 로그아웃은 하지 않는다
export const markConsentRequired = (queryClient: QueryClient): void => {
  queryClient.setQueryData<Me>(ME_QUERY_KEY, (previous) =>
    previous ? { ...previous, hasRequiredConsents: false } : previous,
  )
  queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }).catch(() => undefined)
}
