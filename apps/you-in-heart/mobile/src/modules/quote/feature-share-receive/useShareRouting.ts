import { router } from 'expo-router'
import { type ShareIntent, useShareIntentContext } from 'expo-share-intent'
import { useEffect, useRef } from 'react'
import type { AuthDestination } from '@/modules/auth/util-auth-gate/resolve-auth-redirect'
import { pendingShare } from '../util-share/pending-share'
import { resolveSharePayload, type SharePayload } from '../util-share/resolve-share-payload'

// 공유 화면을 열 수 있는 단계: 탭(저장) 또는 페어링(SCR-14 "먼저 상대와 연결해 주세요")
const isRoutable = (destination: AuthDestination | null): destination is '/(tabs)' | '/pairing' =>
  destination === '/(tabs)' || destination === '/pairing'

const routeOf = (payload: SharePayload, destination: '/(tabs)' | '/pairing') =>
  destination === '/(tabs)' && payload.kind === 'txt-file' ? '/quotes/import' : '/quotes/share'

// 루트에서 공유 인텐트를 받아 기억해 두고, 로그인·연결 단계가 허락하면 원래 공유 화면으로 보낸다
export const useShareRouting = (destination: AuthDestination | null): void => {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()
  const payload = pendingShare((state) => state.payload)
  const handledIntent = useRef<ShareIntent | null>(null)
  const routed = useRef<{ payload: SharePayload; destination: AuthDestination } | null>(null)

  useEffect(() => {
    if (!hasShareIntent || handledIntent.current === shareIntent) return
    handledIntent.current = shareIntent
    const next = resolveSharePayload(shareIntent)
    if (next) pendingShare.getState().set(next)
    resetShareIntent()
  }, [hasShareIntent, shareIntent, resetShareIntent])

  useEffect(() => {
    if (!payload || !isRoutable(destination)) return
    const last = routed.current
    if (last?.payload === payload && last.destination === destination) return
    routed.current = { payload, destination }
    router.push(routeOf(payload, destination))
  }, [payload, destination])
}
