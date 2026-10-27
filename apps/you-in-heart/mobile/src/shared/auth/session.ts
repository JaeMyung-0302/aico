import { useSyncExternalStore } from 'react'
import { tokenStore } from '@/shared/api/token-store'
import { queryClient } from '@/shared/query-client'
import { createSessionStore, type SessionStatus } from './session-store'

// 앱 전역 세션 — 로그아웃·탈퇴·refresh 실패 모두 endSession으로 끝낸다(SecureStore 토큰 + 쿼리 캐시 비움)
// TODO(1B): 위젯 스냅샷 정리도 여기서 한다
export const session = createSessionStore({ tokenStore, onSessionEnd: () => queryClient.clear() })

export const useSessionStatus = (): SessionStatus => useSyncExternalStore(session.subscribe, session.getStatus)
