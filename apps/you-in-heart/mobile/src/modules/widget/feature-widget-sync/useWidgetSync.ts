import type { WidgetSnapshotV1 } from '@you-in-heart/shared'
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useAnniversaries } from '@/modules/anniversary/data-access-anniversary/useAnniversaries'
import { useCouple } from '@/modules/couple/data-access-couple/useCouple'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { useSessionStatus } from '@/shared/auth/session'
import { useNow } from '@/shared/hooks/use-now'
import { flushWidgetEvents } from '../data-access-widget/widget-events'
import { clearWidgetSnapshot, writeWidgetSnapshot } from '../data-access-widget/widget-storage'
import { buildWidgetSnapshot } from '../util-widget/build-widget-snapshot'

const MINUTE_MS = 60_000

// 아직 모름(undefined) → 처음 판단되면 한 번 쓰거나 지운다(콜드 스타트에 남은 스냅샷 정리)
type Written = string | null | undefined

const useLatestSnapshot = () => {
  const sessionStatus = useSessionStatus()
  const isSignedIn = sessionStatus === 'signedIn'
  // 로그아웃 직후 남은 캐시로 스냅샷을 다시 쓰지 않도록, 로그인 상태일 때만 /me 를 본다
  const me = useMe()
  const meData = isSignedIn ? me.data : undefined
  const summary = meData?.couple
  const isPaired = summary?.status === 'ACTIVE' && Boolean(summary.startedOn)
  const couple = useCouple({ isEnabled: isPaired })
  const anniversaries = useAnniversaries({ isEnabled: isPaired })
  const nowMs = useNow(MINUTE_MS)
  // 쓰기 1회 원칙: 이름·다음 기념일까지 받은 뒤(실패면 대체값) 판단한다. 세션·/me 조회 중에는 기존 위젯을 둔다
  const isPairedSettled =
    !isPaired ||
    ((couple.data !== undefined || couple.isError) && (anniversaries.data !== undefined || anniversaries.isError))
  const isSettled = sessionStatus === 'signedOut' || (isSignedIn && meData !== undefined && isPairedSettled)
  const snapshot = isSettled
    ? buildWidgetSnapshot({ me: meData, couple: couple.data, anniversaries: anniversaries.data, nowMs })
    : null
  return { isSettled, snapshot, isSignedIn }
}

// 루트 레이아웃에서 한 번 쓴다. 로그인·페어링·사귄 날·기념일이 바뀌면 스냅샷을 1회 쓰고, 앱이 포그라운드로 오면 다시 쓴다.
// 로그아웃·탈퇴·refresh 실패(세션 종료)와 연결 해제(UNLINKING)면 지우고 위젯을 다시 그린다
export const useWidgetSync = (): void => {
  const { isSettled, snapshot, isSignedIn } = useLatestSnapshot()
  const serialized = snapshot ? JSON.stringify(snapshot) : null
  const written = useRef<Written>(undefined)
  // 포그라운드 리스너가 볼 최신 스냅샷 (렌더 중에는 ref 를 건드리지 않는다)
  const latest = useRef<WidgetSnapshotV1 | null>(null)

  // 내용(serialized)이 바뀔 때만 쓴다 — snapshot 은 렌더마다 새 객체라 비교에 쓰지 않는다
  useEffect(() => {
    latest.current = snapshot
    if (!isSettled || serialized === written.current) return
    written.current = serialized
    const task = snapshot ? writeWidgetSnapshot(snapshot) : clearWidgetSnapshot()
    task.catch(() => undefined)
  }, [isSettled, serialized, snapshot])

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState
    const subscription = AppState.addEventListener('change', (next) => {
      const isForeground = next === 'active' && previous !== 'active'
      previous = next
      if (isForeground && latest.current) writeWidgetSnapshot(latest.current).catch(() => undefined)
    })
    return () => subscription.remove()
  }, [])

  // Android 위젯이 headless 로 쌓은 widget_added 를 로그인 상태에서 보낸다
  useEffect(() => {
    if (isSignedIn) flushWidgetEvents().catch(() => undefined)
  }, [isSignedIn])
}
