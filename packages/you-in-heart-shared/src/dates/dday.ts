// D-day·기념일 계산 (서버 cron·앱·Android 위젯 공용). iOS 위젯(Swift)도 같은 규칙을 fixtures/dday-cases.json으로 맞춘다.
// 규칙
// - 타임존은 Asia/Seoul 고정(UTC+9, DST 없음) → 고정 오프셋 산술로 충분
// - 사귄 날 당일 = D+1. 사귄 날이 미래면 D-n (D+0은 없다)
// - N*100일 = 사귄 날 + (N*100 - 1)일 (100일, 200일, …, 1000일, …)
// - N주년 = 사귄 날의 N년 뒤 같은 날짜(365일째와 다름). 2/29 시작은 평년에 2/28
// - 커스텀 기념일 = 원래 날짜 이후 매년 같은 날짜(2/29는 평년 2/28). 원래 날짜 이전 해에는 만들지 않는다
// - 결과 범위는 [today, today + horizonDays] 양끝 포함, 날짜 → 주년 → 100일 단위 → 커스텀 → refKey 순 정렬

export type Instant = Date | string | number

export type Dday = { days: number; label: string }

export type AnniversaryKind = 'YEARLY' | 'HUNDRED_DAYS' | 'CUSTOM'

// id: 커스텀은 원래 id, 자동은 'auto:100d:300'·'auto:year:1'. refKey: NotificationLog 중복 차단 키('auto:…' 또는 'custom:{id}')
export type ComputedAnniversary = { id: string; refKey: string; kind: AnniversaryKind; title: string; date: string }

export type CustomAnniversaryInput = { id: string; title: string; date: string }

export type ComputeAnniversariesInput = {
  startedOn: string | null
  customs: readonly CustomAnniversaryInput[]
  today: string
  horizonDays: number
}

const DAY_MS = 86_400_000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const KIND_RANK: Record<AnniversaryKind, number> = { YEARLY: 0, HUNDRED_DAYS: 1, CUSTOM: 2 }

type Ymd = { y: number; m: number; d: number }

const parseYmd = (value: string): Ymd => {
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new RangeError(`잘못된 날짜: ${value}`)
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    throw new RangeError(`잘못된 날짜: ${value}`)
  }
  return { y, m, d }
}

// 1970-01-01 기준 일 번호
const toDayNumber = ({ y, m, d }: Ymd): number => Date.UTC(y, m - 1, d) / DAY_MS
const formatDayNumber = (dayNumber: number): string => new Date(dayNumber * DAY_MS).toISOString().slice(0, 10)

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

// 같은 월·일의 다른 해. 평년의 2/29는 2/28로 내린다
const sameDayInYear = ({ m, d }: Ymd, year: number): number =>
  toDayNumber({ y: year, m, d: m === 2 && d === 29 && !isLeapYear(year) ? 28 : d })

export const toKstDate = (instant: Instant): string => {
  const ms = instant instanceof Date ? instant.getTime() : new Date(instant).getTime()
  if (Number.isNaN(ms)) throw new RangeError(`잘못된 시각: ${String(instant)}`)
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10)
}

export const computeDday = (startedOn: string, now: Instant): Dday => {
  const diff = toDayNumber(parseYmd(toKstDate(now))) - toDayNumber(parseYmd(startedOn))
  if (diff >= 0) return { days: diff + 1, label: `D+${diff + 1}` }
  return { days: diff, label: `D${diff}` }
}

const hundredDayMilestones = (start: number, from: number, to: number): ComputedAnniversary[] => {
  const firstK = Math.max(1, Math.ceil((from - start + 1) / 100))
  const lastK = Math.floor((to - start + 1) / 100)
  return Array.from({ length: Math.max(0, lastK - firstK + 1) }, (_, i) => {
    const days = (firstK + i) * 100
    return {
      id: `auto:100d:${days}`,
      refKey: `auto:100d:${days}`,
      kind: 'HUNDRED_DAYS' as const,
      title: `${days}일`,
      date: formatDayNumber(start + days - 1),
    }
  })
}

// origin 이후(origin 포함) 매년 같은 날짜 중 [from, to]에 드는 해
const yearlyOccurrences = (origin: Ymd, from: number, to: number): { years: number; dayNumber: number }[] => {
  const originDay = toDayNumber(origin)
  const fromYear = Number(formatDayNumber(from).slice(0, 4))
  const toYear = Number(formatDayNumber(to).slice(0, 4))
  return Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)
    .map((year) => ({ years: year - origin.y, dayNumber: sameDayInYear(origin, year) }))
    .filter(({ dayNumber }) => dayNumber >= originDay && dayNumber >= from && dayNumber <= to)
}

const compareAnniversaries = (a: ComputedAnniversary, b: ComputedAnniversary): number =>
  a.date.localeCompare(b.date) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.refKey.localeCompare(b.refKey)

const autoAnniversaries = (start: Ymd, from: number, to: number): ComputedAnniversary[] => {
  const yearly = yearlyOccurrences(start, from, to)
    .filter(({ years }) => years >= 1)
    .map(({ years, dayNumber }) => ({
      id: `auto:year:${years}`,
      refKey: `auto:year:${years}`,
      kind: 'YEARLY' as const,
      title: `${years}주년`,
      date: formatDayNumber(dayNumber),
    }))
  return [...hundredDayMilestones(toDayNumber(start), from, to), ...yearly]
}

export const computeAnniversaries = ({
  startedOn,
  customs,
  today,
  horizonDays,
}: ComputeAnniversariesInput): ComputedAnniversary[] => {
  if (!Number.isInteger(horizonDays) || horizonDays < 0) throw new RangeError(`잘못된 horizonDays: ${horizonDays}`)
  const from = toDayNumber(parseYmd(today))
  const to = from + horizonDays

  const autos = startedOn === null ? [] : autoAnniversaries(parseYmd(startedOn), from, to)
  const customItems = customs.flatMap((custom) =>
    yearlyOccurrences(parseYmd(custom.date), from, to).map(({ dayNumber }) => ({
      id: custom.id,
      refKey: `custom:${custom.id}`,
      kind: 'CUSTOM' as const,
      title: custom.title,
      date: formatDayNumber(dayNumber),
    })),
  )
  return [...autos, ...customItems].sort(compareAnniversaries)
}
