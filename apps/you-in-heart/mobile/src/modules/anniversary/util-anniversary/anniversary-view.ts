import { type AnniversaryItem, computeDday, toKstDate } from '@you-in-heart/shared'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'

const DAY_MS = 86_400_000
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
// 지난 기념일은 최근 것부터 이만큼만 보여준다
const MAX_PAST_ITEMS = 5

// 'YYYY-MM-DD' 를 days 만큼 옮긴다 (UTC 자정 기준 산술 → 타임존 영향 없음)
export const shiftIsoDate = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

// 홈·기념일 화면·위젯이 함께 쓰는 조회 범위: 지난 1년 ~ 앞으로 1년 (커스텀은 1년에 한 번씩 꼭 들어온다)
export const anniversaryRange = (nowMs: number): { from: string; to: string } => {
  const today = toKstDate(nowMs)
  return { from: shiftIsoDate(today, -365), to: shiftIsoDate(today, 365) }
}

// "D-87" — 오늘이면 "D-day"
export const toCountdownLabel = (isoDate: string, nowMs: number): string => {
  const { days } = computeDday(isoDate, nowMs)
  return days < 0 ? `D${days}` : 'D-day'
}

// "2027. 01. 22 (금)"
export const formatWeekdayDate = (isoDate: string): string =>
  `${formatDotDate(isoDate)} (${WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()]})`

// 커스텀 기념일은 매년 반복 → "매년 08. 23"
export const formatYearlyDate = (isoDate: string): string => `매년 ${formatDotDate(isoDate.slice(5))}`

// 서버 목록은 날짜순이지만 순서에 기대지 않는다
export const findNextAnniversary = (items: readonly AnniversaryItem[], nowMs: number): AnniversaryItem | null => {
  const today = toKstDate(nowMs)
  return items
    .filter((item) => item.date >= today)
    .reduce<AnniversaryItem | null>((best, item) => (best === null || item.date < best.date ? item : best), null)
}

export type AnniversaryGroups = {
  upcoming: AnniversaryItem[]
  customs: AnniversaryItem[]
  past: AnniversaryItem[]
}

// SCR-04 세 구역: 다가오는 자동 기념일 / 우리가 정한 날(다가오는 커스텀) / 지난 기념일(최근순)
export const groupAnniversaries = (items: readonly AnniversaryItem[], nowMs: number): AnniversaryGroups => {
  const today = toKstDate(nowMs)
  const byDate = [...items].sort((a, b) => a.date.localeCompare(b.date))
  const coming = byDate.filter((item) => item.date >= today)
  return {
    upcoming: coming.filter((item) => item.kind !== 'CUSTOM'),
    customs: coming.filter((item) => item.kind === 'CUSTOM'),
    past: byDate
      .filter((item) => item.date < today)
      .reverse()
      .slice(0, MAX_PAST_ITEMS),
  }
}
