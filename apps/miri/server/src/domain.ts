/** 서버와 클라이언트가 공유하는 값 정의. 옵션에 없는 값은 저장하지 않는다. */

export const KINDS = ['gym', 'cardio', 'light', 'rest'] as const
export const PARTS = ['chest', 'back', 'legs', 'shoulders_arms'] as const
export const INTENSITIES = ['easy', 'normal', 'hard'] as const
export const NOTIFY_SLOTS = ['07:30', '12:30', '18:30', '21:00'] as const

export type Kind = (typeof KINDS)[number]
export type Part = (typeof PARTS)[number]
export type Intensity = (typeof INTENSITIES)[number]
export type NotifySlot = (typeof NOTIFY_SLOTS)[number]

/** 하루 기록 한 건. parts 는 헬스일 때만, intensity 는 헬스와 유산소일 때만 채워진다. */
export type Entry = {
  kind: Kind
  parts: Part[]
  intensity: Intensity | null
}

export const KIND_LABEL: Record<Kind, string> = {
  gym: '헬스',
  cardio: '유산소',
  light: '가볍게',
  rest: '쉼',
}

export const PART_LABEL: Record<Part, string> = {
  chest: '가슴',
  back: '등',
  legs: '하체',
  shoulders_arms: '어깨팔',
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  easy: '가벼움',
  normal: '적당',
  hard: '빡셈',
}

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

export function isPart(value: unknown): value is Part {
  return typeof value === 'string' && (PARTS as readonly string[]).includes(value)
}

export function isIntensity(value: unknown): value is Intensity {
  return typeof value === 'string' && (INTENSITIES as readonly string[]).includes(value)
}

export function isNotifySlot(value: unknown): value is NotifySlot {
  return typeof value === 'string' && (NOTIFY_SLOTS as readonly string[]).includes(value)
}

/** 강도를 받는 종류인지. 쉼과 가볍게는 1탭으로 끝난다. */
export function wantsIntensity(kind: Kind): boolean {
  return kind === 'gym' || kind === 'cardio'
}

/**
 * 입력을 저장 가능한 Entry 로 정규화한다. 종류에 맞지 않는 값은 조용히 버린다.
 * 예를 들어 쉼에 강도가 오면 null, 유산소에 부위가 오면 빈 배열.
 */
export function normalizeEntry(input: {
  kind: unknown
  parts?: unknown
  intensity?: unknown
}): Entry | null {
  if (!isKind(input.kind)) return null

  const rawParts: unknown[] = Array.isArray(input.parts) ? input.parts : []
  const parts =
    input.kind === 'gym' ? [...new Set(rawParts.filter(isPart))].sort(byPartOrder) : []
  const intensity =
    wantsIntensity(input.kind) && isIntensity(input.intensity) ? input.intensity : null

  return { kind: input.kind, parts, intensity }
}

function byPartOrder(a: Part, b: Part): number {
  return PARTS.indexOf(a) - PARTS.indexOf(b)
}

/** "헬스, 가슴 하체, 적당" 처럼 사람이 읽는 한 줄. 알림 문구와 확인 카드가 같이 쓴다. */
export function describeEntry(entry: Entry): string {
  const pieces = [KIND_LABEL[entry.kind]]
  if (entry.parts.length > 0) pieces.push(entry.parts.map((part) => PART_LABEL[part]).join(' '))
  if (entry.intensity) pieces.push(INTENSITY_LABEL[entry.intensity])
  return pieces.join(', ')
}
