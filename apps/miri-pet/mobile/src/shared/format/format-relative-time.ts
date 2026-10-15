const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const KST_OFFSET_MS = 9 * HOUR_MS

const pad = (value: number) => String(value).padStart(2, '0')

// 피드·댓글·알림 시각: 방금 전 / N분 전 / N시간 전 / N일 전 / 7일 이상은 KST 날짜
export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  const at = new Date(iso)
  const diff = now.getTime() - at.getTime()
  if (diff < MINUTE_MS) return '방금 전'
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}시간 전`
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)}일 전`
  const kst = new Date(at.getTime() + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())}`
}
