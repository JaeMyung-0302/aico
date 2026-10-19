/**
 * Worker 는 UTC 로 돈다. v1 은 전원 한국 기준이므로 시각 계산을 한 곳에 모은다.
 * 사용자별 타임존을 열게 되면 이 모듈만 바꾸면 된다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function shifted(now: Date): Date {
  return new Date(now.getTime() + KST_OFFSET_MS)
}

/** KST 기준 날짜. YYYY-MM-DD */
export function kstDate(now: Date = new Date()): string {
  return shifted(now).toISOString().slice(0, 10)
}

/** KST 기준 요일. 0=일요일 */
export function kstWeekday(now: Date = new Date()): number {
  return shifted(now).getUTCDay()
}

/** KST 기준 시각을 cron 주기에 맞춰 내림한다. HH:MM */
export function kstSlot(now: Date = new Date(), stepMinutes: number): string {
  const date = shifted(now)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(Math.floor(date.getUTCMinutes() / stepMinutes) * stepMinutes).padStart(
    2,
    '0',
  )
  return `${hours}:${minutes}`
}

/** YYYY-MM-DD 에 일수를 더한다. 주간 범위와 요일 히스토리 조회에 쓴다. */
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/** YYYY-MM-DD 의 요일. 0=일요일 */
export function weekdayOf(date: string): number {
  return new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay()
}
