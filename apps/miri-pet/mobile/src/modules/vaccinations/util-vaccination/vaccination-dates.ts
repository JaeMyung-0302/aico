import { VACCINE_PRESETS, type VaccineType } from '@miri-pet/shared'

// 서버 리마인더(KST)와 같은 기준으로 D-day를 센다
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const isIsoDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const kstToday = (now: Date): string => new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)

// 월말 보정: 1/31 + 1개월 = 2/28
export const addMonths = (isoDate: string, months: number): string => {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number)
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(
    Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(day, lastDay)),
  )
    .toISOString()
    .slice(0, 10)
}

// 디자인 15: "종합백신은 보통 1년 주기라 1년 뒤로 채워뒀어요" — 심장사상충은 매월, 직접 입력은 비움
export const defaultNextDueOn = (type: VaccineType, administeredOn: string): string | null => {
  if (type === 'ETC' || !isIsoDate(administeredOn)) return null
  return addMonths(administeredOn, type === 'HEARTWORM' ? 1 : 12)
}

export const dDayLabel = (days: number): string => (days === 0 ? 'D-DAY' : `D-${days}`)

export const formatDotDate = (isoDate: string): string => isoDate.replaceAll('-', '.')

// 날짜 입력칸: 숫자만 받아 YYYY-MM-DD로 끊는다 (date picker 의존성 없이)
export const formatDateInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-')
}

const PRESET_LABEL: ReadonlyMap<VaccineType, string> = new Map(VACCINE_PRESETS.map((p) => [p.type, p.label]))

export const vaccineLabel = (type: VaccineType, customName: string | null): string =>
  type === 'ETC' ? (customName ?? '직접 입력') : (PRESET_LABEL.get(type) ?? type)
