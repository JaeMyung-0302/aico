/**
 * 트랙 카탈로그. 미리가 물을 수 있는 분야와 각 분야의 단계별 선택지 전부.
 * 사용자가 트랙을 만들지는 않는다. 화면은 이 정의를 읽어 그려지고, 저장은 이 정의로 검증한다.
 * AI 가 붙어도 문구만 쓰고 선택지는 여기서만 나온다.
 */

export const TONES = ['blue', 'teal', 'amber', 'violet'] as const
export type Tone = (typeof TONES)[number]

export type Choice = {
  value: string
  label: string
  /** 마커 색조. 첫 단계 선택지에 준다. */
  tone?: Tone
  /** 마커 길이(1~3). 강도처럼 정도를 나타내는 단계에 준다. */
  level?: 1 | 2 | 3
}

export type StepDef = {
  key: string
  question: string
  choices: readonly Choice[]
  columns: 2 | 3
  /** 여러 개 고르는 단계. 하나 이상 골라야 한다. */
  multi?: boolean
  /** 이전 답이 이 값일 때만 묻는다. { kind: ['gym'] } */
  when?: Readonly<Record<string, readonly string[]>>
  /** 이 단계의 색조를 이전 단계 답에서 가져온다. */
  toneFrom?: string
}

export type Answer = Record<string, string | string[]>

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
}

export const TRACK_IDS = ['exercise', 'sleep', 'meals', 'focus', 'mood'] as const
export type TrackId = (typeof TRACK_IDS)[number]

const EXERCISE_PARTS: readonly Choice[] = [
  { value: 'chest', label: '가슴' },
  { value: 'back', label: '등' },
  { value: 'legs', label: '하체' },
  { value: 'shoulders_arms', label: '어깨팔' },
]

const LEVELS = (labels: [string, string, string]): readonly Choice[] =>
  labels.map((label, index) => ({
    value: ['low', 'mid', 'high'][index] as string,
    label,
    level: (index + 1) as 1 | 2 | 3,
  }))

function summarizeExercise(answers: Answer[]): string {
  const kinds = { gym: 0, cardio: 0, light: 0, rest: 0 }
  const parts = { chest: 0, back: 0, legs: 0, shoulders_arms: 0 }
  for (const answer of answers) {
    if (typeof answer.kind === 'string' && answer.kind in kinds) kinds[answer.kind as keyof typeof kinds] += 1
    if (Array.isArray(answer.parts)) {
      for (const part of answer.parts) if (part in parts) parts[part as keyof typeof parts] += 1
    }
  }
  if (answers.length === 0) return '운동 기록이 없었어요'

  const kindLabel = { gym: '헬스', cardio: '유산소', light: '가볍게', rest: '쉼' }
  const kindLine = (Object.keys(kinds) as (keyof typeof kinds)[])
    .filter((kind) => kinds[kind] > 0)
    .map((kind) => `${kindLabel[kind]} ${kinds[kind]}번`)
    .join(', ')
  if (kinds.gym === 0) return `운동 ${kindLine}`

  const missed = EXERCISE_PARTS.filter((part) => parts[part.value as keyof typeof parts] === 0)
  const partLine =
    missed.length === 0
      ? '네 부위 다 챙겼어요'
      : `${missed.map((part) => part.label).join(', ')}${missed.length === 1 ? '는' : '은'} 없었어요`
  return `운동 ${kindLine}. ${partLine}`
}

export const TRACKS: Readonly<Record<TrackId, TrackDef>> = {
  exercise: {
    id: 'exercise',
    name: '운동',
    templates: [
      '오늘 몸 어떻게 썼어요?',
      '오늘 운동은요?',
      '몸 좀 움직였어요?',
      '오늘 하루, 몸은 어땠어요?',
      '운동 어떻게 됐어요?',
    ],
    confirmTemplates: ['오늘도 {x}?', '{x}, 오늘도요?', '이번에도 {x}?'],
    defaultNotifyAt: '21:00',
    primary: 'kind',
    quick: { title: '쉼', answer: { kind: 'rest' } },
    summarize: summarizeExercise,
    steps: [
      {
        key: 'kind',
        question: '오늘 몸 어떻게 썼어요?',
        columns: 2,
        choices: [
          { value: 'gym', label: '헬스', tone: 'blue' },
          { value: 'cardio', label: '유산소', tone: 'teal' },
          { value: 'light', label: '가볍게', tone: 'amber' },
          { value: 'rest', label: '쉼', tone: 'violet' },
        ],
      },
      {
        key: 'parts',
        question: '어디 했어요?',
        columns: 2,
        multi: true,
        when: { kind: ['gym'] },
        toneFrom: 'kind',
        choices: EXERCISE_PARTS,
      },
      {
        key: 'intensity',
        question: '어땠어요?',
        columns: 3,
        when: { kind: ['gym', 'cardio'] },
        toneFrom: 'kind',
        choices: LEVELS(['가벼움', '적당', '빡셈']),
      },
    ],
  },
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

/** 이전 답을 보고 이 단계를 물을지 정한다. */
export function isStepActive(step: StepDef, answer: Answer): boolean {
  if (!step.when) return true
  return Object.entries(step.when).every(([key, allowed]) => {
    const value = answer[key]
    return typeof value === 'string' && allowed.includes(value)
  })
}

function choiceValues(step: StepDef): string[] {
  return step.choices.map((choice) => choice.value)
}

/**
 * 입력을 저장 가능한 답으로 정규화한다.
 * strict: 물어야 할 단계가 빠지면 null (쓰기). lenient: 빠진 단계는 건너뛴다 (읽기).
 * 어느 쪽이든 선택지 밖 값은 버린다.
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
    const valid = choiceValues(step)
    const raw = source[step.key]

    if (step.multi) {
      const picked = Array.isArray(raw)
        ? [...new Set(raw.filter((value): value is string => typeof value === 'string' && valid.includes(value)))]
        : []
      if (picked.length === 0) {
        if (mode === 'strict') return null
        continue
      }
      answer[step.key] = picked.sort((a, b) => valid.indexOf(a) - valid.indexOf(b))
      continue
    }

    if (typeof raw !== 'string' || !valid.includes(raw)) {
      if (mode === 'strict') return null
      continue
    }
    answer[step.key] = raw
  }
  return answer
}

/** "헬스, 가슴 하체, 적당" 처럼 사람이 읽는 한 줄. 알림 문구와 확인 카드가 같이 쓴다. */
export function describeAnswer(track: TrackDef, answer: Answer): string {
  const pieces: string[] = []
  for (const step of track.steps) {
    const value = answer[step.key]
    if (value === undefined) continue
    const labelOf = (v: string) => step.choices.find((choice) => choice.value === v)?.label ?? v
    pieces.push(Array.isArray(value) ? value.map(labelOf).join(' ') : labelOf(value))
  }
  return pieces.join(', ')
}

/** 하루의 색조. 첫 단계 답의 tone. */
export function toneOf(track: TrackDef, answer: Answer): Tone | null {
  const step = track.steps.find((item) => item.key === track.primary)
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
  return rotate(track.confirmTemplates, dayIndex, salt).replace('{x}', describeAnswer(track, prediction))
}

/** 주간 요약 한 줄. 트랙 고유 요약이 있으면 그것, 없으면 "수면 5일, 7~8시간이 3번". */
export function summarizeTrackWeek(track: TrackDef, answers: Answer[]): string {
  if (track.summarize) return track.summarize(answers)
  if (answers.length === 0) return `${track.name} 기록이 없었어요`

  const step = track.steps.find((item) => item.key === track.primary)
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
