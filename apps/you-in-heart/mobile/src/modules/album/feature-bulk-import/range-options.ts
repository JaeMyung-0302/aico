import type { DateRange } from '@/modules/media/util-pick-assets/list-assets-by-date-range'

export type RangeOptionId = 'together' | 'recent' | 'custom'
export type RangeOption = { id: RangeOptionId; label: string; range: DateRange | null }

const DAY_MS = 86_400_000
const RECENT_DAYS = 90

// KST 'YYYY-MM-DD' 의 시작·끝 시각
export const kstDayStartMs = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00+09:00`)
export const kstDayEndMs = (isoDate: string): number => kstDayStartMs(isoDate) + DAY_MS - 1

// SCR-08 기간 옵션: 사귄 날부터 지금까지(사귄 날이 있을 때) · 최근 3개월 · 직접 고르기
export const buildRangeOptions = ({
  startedOn,
  nowMs,
  custom,
}: {
  startedOn: string | null
  nowMs: number
  custom: DateRange | null
}): RangeOption[] => [
  ...(startedOn
    ? [{ id: 'together' as const, label: '사귄 날부터 지금까지', range: { fromMs: kstDayStartMs(startedOn), toMs: nowMs } }]
    : []),
  { id: 'recent', label: '최근 3개월', range: { fromMs: nowMs - RECENT_DAYS * DAY_MS, toMs: nowMs } },
  { id: 'custom', label: '기간 직접 고르기', range: custom },
]
