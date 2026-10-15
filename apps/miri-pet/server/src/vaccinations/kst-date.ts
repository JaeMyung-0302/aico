// 한국 표준시(UTC+9, 서머타임 없음) 날짜 계산. DB의 @db.Date는 UTC 자정 Date로 주고받는다
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const shiftToKst = (now: Date): Date => new Date(now.getTime() + KST_OFFSET_MS)

// now 시점의 KST 날짜 (YYYY-MM-DD)
export const kstToday = (now: Date): string => shiftToKst(now).toISOString().slice(0, 10)

// now 시점의 KST 시(0~23)
export const kstHour = (now: Date): number => shiftToKst(now).getUTCHours()

// YYYY-MM-DD → 그날 UTC 자정 Date (Prisma @db.Date 입력값)
export const toDbDate = (isoDate: string): Date => {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  if (!ISO_DATE.test(isoDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError(`잘못된 날짜: ${isoDate}`)
  }
  return date
}

// Prisma @db.Date 출력값 → YYYY-MM-DD
export const fromDbDate = (date: Date): string => date.toISOString().slice(0, 10)

export const addDays = (isoDate: string, days: number): string =>
  fromDbDate(new Date(toDbDate(isoDate).getTime() + days * DAY_MS))

// from → to 까지 일수 (to가 이후면 양수)
export const daysBetween = (from: string, to: string): number =>
  Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / DAY_MS)
