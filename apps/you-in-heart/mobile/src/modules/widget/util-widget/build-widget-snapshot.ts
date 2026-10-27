import {
  type AnniversaryItem,
  computeAnniversaries,
  type Couple,
  type MeResponse,
  toKstDate,
  WidgetSnapshotV1,
} from '@you-in-heart/shared'
import { findNextAnniversary } from '@/modules/anniversary/util-anniversary/anniversary-view'
import { findPartnerName } from '@/modules/couple/util-pairing/partner-name'

// 목록을 아직 못 받았을 때 사귄 날만으로 다음 100일·주년을 찾는 범위(1년 + 하루면 주년이 꼭 들어온다)
const FALLBACK_HORIZON_DAYS = 366

type BuildWidgetSnapshotInput = {
  me: MeResponse | undefined
  couple: Couple | undefined
  anniversaries: readonly AnniversaryItem[] | undefined
  nowMs: number
}

const findNext = (startedOn: string, anniversaries: readonly AnniversaryItem[] | undefined, nowMs: number) => {
  const items =
    anniversaries ??
    computeAnniversaries({ startedOn, customs: [], today: toKstDate(nowMs), horizonDays: FALLBACK_HORIZON_DAYS })
  const next = findNextAnniversary(items, nowMs)
  return next ? { title: next.title, date: next.date } : null
}

// 위젯에 넣는 유일한 데이터(shared WidgetSnapshotV1). 필요한 필드만 골라 담고 strict 스키마로 한 번 더 막는다.
// null = 보여줄 D-day 가 없음(미로그인·미연결·사귄 날 없음·연결 해제 유예 중) → 위젯 비움
export const buildWidgetSnapshot = ({ me, couple, anniversaries, nowMs }: BuildWidgetSnapshotInput) => {
  const summary = me?.couple
  if (!me || !summary || summary.status !== 'ACTIVE' || !summary.startedOn) return null
  return WidgetSnapshotV1.parse({
    v: 1,
    startedOn: summary.startedOn,
    names: [me.displayName ?? '', findPartnerName(couple, me.id)],
    next: findNext(summary.startedOn, anniversaries, nowMs),
  })
}
