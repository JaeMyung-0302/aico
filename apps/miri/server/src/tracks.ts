/**
 * 트랙 카탈로그. 미리가 물을 수 있는 분야와 각 분야의 단계별 선택지 전부.
 * 사용자가 트랙을 만들지는 않는다. 화면은 이 정의를 읽어 그려지고, 저장은 이 정의로 검증한다.
 * AI 가 붙어도 문구만 쓰고 선택지는 여기서만 나온다.
 */

import { labelFor, parseCustom } from './choices.ts'
import { EXERCISE } from './exercise.ts'

export const TONES = ['blue', 'teal', 'amber', 'violet'] as const
export type Tone = (typeof TONES)[number]

export type Choice = {
  value: string
  label: string
  /** 마커 색조. 첫 단계 선택지에 준다. */
  tone?: Tone
  /** 마커 길이(1~3). 강도처럼 정도를 나타내는 단계에 준다. */
  level?: 1 | 2 | 3
  /** 앞 단계 답으로 좁힐 때 쓰는 묶음. 종목의 부위처럼. */
  group?: string
}

/** 키보드 없이 +/- 로 고르는 수. 범위와 간격 밖의 값은 저장하지 않는다. */
export type NumberRange = {
  min: number
  max: number
  step: number
  /** "kg", "회", "분" 처럼 수 뒤에 붙는 단위 */
  unit: string
  /** 처음 보여줄 값. 없으면 min. */
  initial?: number
  /** 0 을 수 대신 부르는 말. 맨몸 운동의 무게처럼. */
  zeroLabel?: string
  /** time: 자정부터의 분을 HH:MM 으로 읽는다. 단위는 쓰지 않는다. */
  format?: 'time'
}

type StepBase = {
  key: string
  question: string
  /** 이전 답이 이 값일 때만 묻는다. { kind: ['gym'] } */
  when?: Readonly<Record<string, readonly string[]>>
  /** 같은 화면에 묶어 묻는 단계들의 이름. 운동 시각의 "시작"과 "얼마나"처럼. */
  screen?: string
  /** 한 화면에 여럿일 때 칸 이름. 없으면 question. */
  label?: string
}

export type ChoiceStepDef = StepBase & {
  kind?: 'choice'
  choices: readonly Choice[]
  columns: 2 | 3
  /** 여러 개 고르는 단계. 하나 이상 골라야 한다. */
  multi?: boolean
  /** 이 단계의 색조를 이전 단계 답에서 가져온다. */
  toneFrom?: string
}

export type NumberStepDef = StepBase & NumberRange & { kind: 'number' }

/** 묶음 안의 한 칸. 선택지이거나 수다. */
export type EntryField =
  | {
      key: string
      label: string
      kind: 'choice'
      choices: readonly Choice[]
      /** 이 단계 답에 든 group 의 선택지만 보여준다. 검증은 전체 선택지로 한다. */
      groupFrom?: string
      /** 사용자가 이름을 직접 더할 수 있다. 값은 "custom:<group>:<이름>" 이고 group 은 선택지에 있는 것만. */
      custom?: { maxLength: number }
    }
  | ({ key: string; label: string; kind: 'number' } & NumberRange)

/** 같은 묶음을 여러 번 쌓는 단계. 운동의 "종목, 무게, 반복, 세트" 한 줄이 한 묶음이다. */
export type EntriesStepDef = StepBase & {
  kind: 'entries'
  fields: readonly EntryField[]
  maxEntries: number
}

export type StepDef = ChoiceStepDef | NumberStepDef | EntriesStepDef

export type Entry = Record<string, string | number>
export type AnswerValue = string | string[] | number | Entry[]
export type Answer = Record<string, AnswerValue>

export type HistoryLog = { loggedOn: string; answer: Answer }

export type TrackDef = {
  id: TrackId
  name: string
  /** 열린 질문 문구. 날마다 돌려 쓴다. */
  templates: readonly string[]
  /** 예측 확인 문구. {x} 자리에 답 설명이 들어간다. */
  confirmTemplates: readonly string[]
  steps: readonly StepDef[]
  defaultNotifyAt: string
  /** 하루의 색을 정하는 단계. 히트맵과 주간 스트립이 이 답의 색조를 쓴다. */
  primary: string
  /** 알림 버튼 하나로 끝낼 수 있는 답. 첫 단계에서 흐름이 끝나는 값만 둔다. */
  quick?: { title: string; answer: Answer }
  /** 트랙 고유 주간 요약. 없으면 공통 요약을 쓴다. */
  summarize?: (answers: Answer[]) => string
  /**
   * 저장 직후 돌려줄 사실들. 판단은 여기서만 하고 AI 는 문장만 다듬는다.
   * history 는 오늘을 뺀 최근 기록(날짜 오름차순), today 는 KST 오늘. 할 말이 없으면 빈 배열.
   */
  feedback?: (answer: Answer, history: HistoryLog[], today: string) => string[]
  /** 확인 질문에 넣을 짧은 이름. "가슴 하체 루틴". 없으면 답 전체를 풀어 쓴다. */
  brief?: (answer: Answer) => string
  /** 예측이 묶어 셀 기준. 세부 수치가 매번 달라도 같은 루틴으로 본다. 없으면 답 전체. */
  routineKey?: (answer: Answer) => string
}

export const TRACK_IDS = ['exercise', 'sleep', 'meals', 'focus', 'mood'] as const
export type TrackId = (typeof TRACK_IDS)[number]

const LEVELS = (labels: [string, string, string]): readonly Choice[] =>
  labels.map((label, index) => ({
    value: ['low', 'mid', 'high'][index] as string,
    label,
    level: (index + 1) as 1 | 2 | 3,
  }))

export const TRACKS: Readonly<Record<TrackId, TrackDef>> = {
  exercise: EXERCISE,
  sleep: {
    id: 'sleep',
    name: '수면',
    templates: ['어젯밤 잠은요?', '얼마나 잤어요?', '잘 잤어요?', '지난밤 어땠어요?', '잠은 충분했어요?'],
    confirmTemplates: ['어젯밤도 {x}?', '{x}, 지난밤도요?'],
    defaultNotifyAt: '07:30',
    primary: 'hours',
    steps: [
      {
        key: 'hours',
        question: '얼마나 잤어요?',
        columns: 2,
        choices: [
          { value: 'under5', label: '5시간 미만', tone: 'violet' },
          { value: 'h5to6', label: '5~6시간', tone: 'amber' },
          { value: 'h7to8', label: '7~8시간', tone: 'teal' },
          { value: 'over9', label: '9시간 이상', tone: 'blue' },
        ],
      },
      {
        key: 'fresh',
        question: '일어났을 때는요?',
        columns: 3,
        toneFrom: 'hours',
        choices: LEVELS(['무거움', '보통', '개운']),
      },
    ],
  },
  meals: {
    id: 'meals',
    name: '식사',
    templates: ['오늘 식사는요?', '몇 끼 드셨어요?', '오늘 밥은 어땠어요?', '끼니 잘 챙겼어요?', '오늘 먹은 건요?'],
    confirmTemplates: ['오늘도 {x}?', '{x}, 오늘도요?'],
    defaultNotifyAt: '21:00',
    primary: 'count',
    steps: [
      {
        key: 'count',
        question: '몇 끼 먹었어요?',
        columns: 2,
        choices: [
          { value: 'm1', label: '1끼', tone: 'violet' },
          { value: 'm2', label: '2끼', tone: 'amber' },
          { value: 'm3', label: '3끼', tone: 'teal' },
          { value: 'm4', label: '4끼 이상', tone: 'blue' },
        ],
      },
      {
        key: 'amount',
        question: '양은요?',
        columns: 3,
        toneFrom: 'count',
        choices: LEVELS(['가볍게', '적당', '과식']),
      },
    ],
  },
  focus: {
    id: 'focus',
    name: '집중',
    templates: [
      '오늘 집중은요?',
      '얼마나 몰입했어요?',
      '오늘 일이나 공부는요?',
      '집중 시간 어땠어요?',
      '오늘 머리는 얼마나 썼어요?',
    ],
    confirmTemplates: ['오늘도 {x}?', '{x}, 오늘도요?'],
    defaultNotifyAt: '18:30',
    primary: 'hours',
    steps: [
      {
        key: 'hours',
        question: '얼마나 집중했어요?',
        columns: 2,
        choices: [
          { value: 'none', label: '거의 없음', tone: 'violet' },
          { value: 'short', label: '1시간 이하', tone: 'amber' },
          { value: 'mid', label: '1~3시간', tone: 'teal' },
          { value: 'long', label: '3시간 이상', tone: 'blue' },
        ],
      },
    ],
  },
  mood: {
    id: 'mood',
    name: '기분',
    templates: ['오늘 기분은요?', '지금 마음은 어때요?', '오늘 하루 어땠어요?', '기분 한 단어로요?', '오늘의 컨디션은요?'],
    confirmTemplates: ['오늘도 {x}?', '{x}, 오늘도요?'],
    defaultNotifyAt: '21:00',
    primary: 'mood',
    quick: { title: '좋음', answer: { mood: 'good' } },
    steps: [
      {
        key: 'mood',
        question: '오늘 기분은요?',
        columns: 2,
        choices: [
          { value: 'low', label: '힘듦', tone: 'violet' },
          { value: 'meh', label: '그럭저럭', tone: 'amber' },
          { value: 'good', label: '좋음', tone: 'teal' },
          { value: 'great', label: '최고', tone: 'blue' },
        ],
      },
    ],
  },
}

export function isTrackId(value: unknown): value is TrackId {
  return typeof value === 'string' && (TRACK_IDS as readonly string[]).includes(value)
}

export function isChoiceStep(step: StepDef): step is ChoiceStepDef {
  return step.kind === undefined || step.kind === 'choice'
}

/** 이전 답을 보고 이 단계를 물을지 정한다. */
export function isStepActive(step: StepDef, answer: Answer): boolean {
  if (!step.when) return true
  return Object.entries(step.when).every(([key, allowed]) => {
    const value = answer[key]
    return typeof value === 'string' && allowed.includes(value)
  })
}

function choiceValues(choices: readonly Choice[]): string[] {
  return choices.map((choice) => choice.value)
}

const choiceLabel = labelFor

/** 직접 더한 값이 이 칸 규칙에 맞는가. 묶음은 카탈로그에 있는 것, 이름은 길이 안. */
function isValidCustom(field: Extract<EntryField, { kind: 'choice' }>, value: string): boolean {
  if (!field.custom) return false
  const parsed = parseCustom(value)
  if (!parsed || parsed.name.length > field.custom.maxLength) return false
  return field.choices.some((choice) => choice.group === parsed.group)
}

/** 범위 안이고 간격에 맞으면 그 수, 아니면 null. 2.5kg 간격 같은 소수 간격도 받는다. */
export function normalizeNumber(range: NumberRange, raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  if (raw < range.min || raw > range.max) return null
  const steps = (raw - range.min) / range.step
  if (Math.abs(steps - Math.round(steps)) > 1e-6) return null
  return Number((range.min + Math.round(steps) * range.step).toFixed(3))
}

/** 묶음 한 줄. 칸이 하나라도 빠지거나 틀리면 버린다. */
function normalizeEntry(fields: readonly EntryField[], raw: unknown): Entry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const source = raw as Record<string, unknown>
  const entry: Entry = {}
  for (const field of fields) {
    const value = source[field.key]
    if (field.kind === 'choice') {
      if (typeof value !== 'string') return null
      if (!choiceValues(field.choices).includes(value) && !isValidCustom(field, value)) return null
      entry[field.key] = value
      continue
    }
    const number = normalizeNumber(field, value)
    if (number === null) return null
    entry[field.key] = number
  }
  return entry
}

/**
 * 한 단계의 입력을 저장 가능한 값으로. 쓸 수 없으면 null.
 * strict 에서는 묶음 중 한 줄만 틀려도 null, lenient 에서는 틀린 줄만 버린다.
 */
function normalizeStep(step: StepDef, raw: unknown, mode: 'strict' | 'lenient'): AnswerValue | null {
  if (step.kind === 'number') return normalizeNumber(step, raw)

  if (step.kind === 'entries') {
    if (!Array.isArray(raw) || raw.length > step.maxEntries) return null
    const entries = raw.map((item) => normalizeEntry(step.fields, item))
    if (mode === 'strict' && entries.includes(null)) return null
    const kept = entries.filter((entry): entry is Entry => entry !== null)
    return kept.length > 0 ? kept : null
  }

  const valid = choiceValues(step.choices)
  if (step.multi) {
    const picked = Array.isArray(raw)
      ? [...new Set(raw.filter((value): value is string => typeof value === 'string' && valid.includes(value)))]
      : []
    return picked.length > 0 ? picked.sort((a, b) => valid.indexOf(a) - valid.indexOf(b)) : null
  }
  return typeof raw === 'string' && valid.includes(raw) ? raw : null
}

/**
 * 입력을 저장 가능한 답으로 정규화한다.
 * strict: 물어야 할 단계가 빠지면 null (쓰기). lenient: 빠진 단계는 건너뛴다 (읽기).
 * 어느 쪽이든 선택지와 범위 밖 값은 버린다.
 */
export function normalizeAnswer(
  track: TrackDef,
  input: unknown,
  mode: 'strict' | 'lenient' = 'strict',
): Answer | null {
  if (typeof input !== 'object' || input === null) return null
  const source = input as Record<string, unknown>
  const answer: Answer = {}

  for (const step of track.steps) {
    if (!isStepActive(step, answer)) continue
    const value = normalizeStep(step, source[step.key], mode)
    if (value === null) {
      if (mode === 'strict') return null
      continue
    }
    answer[step.key] = value
  }
  return answer
}

/** 자정부터의 분을 HH:MM 으로. 1140 → "19:00" */
export function minutesToClock(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function describeNumber(range: NumberRange, value: number): string {
  if (range.format === 'time') return minutesToClock(value)
  return value === 0 && range.zeroLabel ? range.zeroLabel : `${value}${range.unit}`
}

function describeEntry(fields: readonly EntryField[], entry: Entry): string {
  return fields
    .map((field) => {
      const value = entry[field.key]
      if (value === undefined) return ''
      if (field.kind === 'choice') return choiceLabel(field.choices, String(value))
      return describeNumber(field, Number(value))
    })
    .filter(Boolean)
    .join(' ')
}

/** 묶음 단계 답을 줄마다. 칩과 기록 카드가 한 줄씩 보여줄 때 쓴다. */
export function describeEntries(step: EntriesStepDef, value: AnswerValue): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Entry => typeof item === 'object')
    .map((entry) => describeEntry(step.fields, entry))
}

/** 한 단계 답을 사람이 읽는 조각으로. "가슴 하체", "40분", "벤치프레스 60kg 5회 / 스쿼트 80kg 5회" */
export function describeValue(step: StepDef, value: AnswerValue): string {
  if (step.kind === 'number') return describeNumber(step, Number(value))
  if (step.kind === 'entries') return describeEntries(step, value).join(' / ')
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => choiceLabel(step.choices, item))
      .join(' ')
  }
  return choiceLabel(step.choices, String(value))
}

/** "헬스, 가슴 하체, 적당" 처럼 사람이 읽는 한 줄. 알림 문구와 확인 카드가 같이 쓴다. */
export function describeAnswer(track: TrackDef, answer: Answer): string {
  const pieces: string[] = []
  for (const step of track.steps) {
    const value = answer[step.key]
    if (value === undefined) continue
    pieces.push(describeValue(step, value))
  }
  return pieces.join(', ')
}

/** 확인 질문과 알림에 넣을 짧은 말. 트랙이 정하지 않으면 답 전체. */
export function briefAnswer(track: TrackDef, answer: Answer): string {
  return track.brief?.(answer) ?? describeAnswer(track, answer)
}

/** 하루의 색을 정하는 단계. primary 는 선택지 단계여야 색조가 있다. */
export function primaryStep(track: TrackDef): ChoiceStepDef | null {
  const step = track.steps.find((item) => item.key === track.primary)
  return step && isChoiceStep(step) ? step : null
}

/** 하루의 색조. 첫 단계 답의 tone. */
export function toneOf(track: TrackDef, answer: Answer): Tone | null {
  const step = primaryStep(track)
  const value = answer[track.primary]
  if (!step || typeof value !== 'string') return null
  return step.choices.find((choice) => choice.value === value)?.tone ?? null
}

/** 문구 회전. 같은 사람에게 같은 날 같은 문구, 날이 바뀌면 다음 문구. */
export function rotate<T>(items: readonly T[], dayIndex: number, salt = 0): T {
  const index = ((dayIndex + salt) % items.length + items.length) % items.length
  return items[index] as T
}

export function openQuestionText(track: TrackDef, dayIndex: number, salt = 0): string {
  return rotate(track.templates, dayIndex, salt)
}

export function confirmQuestionText(
  track: TrackDef,
  prediction: Answer,
  dayIndex: number,
  salt = 0,
): string {
  return rotate(track.confirmTemplates, dayIndex, salt).replace('{x}', briefAnswer(track, prediction))
}

/** 주간 요약 한 줄. 트랙 고유 요약이 있으면 그것, 없으면 "수면 5일, 7~8시간이 3번". */
export function summarizeTrackWeek(track: TrackDef, answers: Answer[]): string {
  if (track.summarize) return track.summarize(answers)
  if (answers.length === 0) return `${track.name} 기록이 없었어요`

  const step = primaryStep(track)
  const counts = new Map<string, number>()
  for (const answer of answers) {
    const value = answer[track.primary]
    if (typeof value === 'string') counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top || !step) return `${track.name} ${answers.length}일`
  const label = step.choices.find((choice) => choice.value === top[0])?.label ?? top[0]
  return `${track.name} ${answers.length}일, ${label}이 ${top[1]}번`
}

/**
 * 이 사용자가 기록 안에 직접 더한 선택지들. 묶음 단계 키별로, 처음 쓴 순서대로.
 * 따로 저장하지 않고 기록에서 다시 모은다. 한 번 더한 종목이 다음부터 칩으로 나오게 하는 용도.
 */
export function customChoicesFrom(track: TrackDef, answers: Answer[]): Record<string, Choice[]> {
  const found: Record<string, Choice[]> = {}
  for (const step of track.steps) {
    if (step.kind !== 'entries') continue
    const head = step.fields.find((field) => field.kind === 'choice')
    if (!head || head.kind !== 'choice' || !head.custom) continue
    const seen = new Map<string, Choice>()
    for (const answer of answers) {
      const list = answer[step.key]
      if (!Array.isArray(list)) continue
      for (const entry of list) {
        if (typeof entry !== 'object') continue
        const value = String(entry[head.key])
        if (seen.has(value) || !isValidCustom(head, value)) continue
        const parsed = parseCustom(value)
        if (parsed) seen.set(value, { value, label: parsed.name, group: parsed.group })
      }
    }
    if (seen.size > 0) found[step.key] = [...seen.values()]
  }
  return found
}
