import { toKstDate, UNLINK_GRACE_DAYS } from '@you-in-heart/shared'
import { formatDotDate } from '@/modules/couple/util-pairing/started-on-input'

const DAY_MS = 86_400_000

// "2026. 11. 26" (KST)
export const formatKstDotDate = (instant: string | number): string => formatDotDate(toKstDate(instant))

// 지금 해제하면 지워지는 날 (서버 purgeAfter = now + 30일)
export const expectedPurgeDate = (nowMs: number): string => formatKstDotDate(nowMs + UNLINK_GRACE_DAYS * DAY_MS)

// SCR-16 "삭제까지 29일"
export const daysUntilPurge = (purgeAfter: string, nowMs: number): number =>
  Math.max(0, Math.ceil((Date.parse(purgeAfter) - nowMs) / DAY_MS))
