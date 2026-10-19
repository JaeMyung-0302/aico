import { labelFor, parseCustom } from './choices.ts'
import type { Answer, Choice, Entry, HistoryLog, NumberRange, TrackDef } from './tracks.ts'

/**
 * 운동 트랙. 헬스는 종목마다 세트를 한 줄씩(무게, 반복) 쌓고 유산소는 강도를 받는다.
 * 둘 다 언제 시작해 얼마나 했는지 한 화면에서 받는다.
 * 세트를 더하면 앞 세트를 복사하고 무게를 한 단계 올려 두어, 피라미드 세트는 반복만 고치면 된다.
 * tracks.ts 가 이 파일을 불러오므로 여기서는 tracks.ts 의 값을 가져오지 않는다(타입만).
 */

export const EXERCISE_PARTS: readonly Choice[] = [
  { value: 'chest', label: '가슴' },
  { value: 'back', label: '등' },
  { value: 'legs', label: '하체' },
  { value: 'shoulders', label: '어깨' },
  { value: 'triceps', label: '삼두' },
  { value: 'biceps', label: '이두' },
]

/** 빠진 부위를 짚을 때 보는 큰 부위. 팔은 따로 안 하는 날이 흔해서 뺀다. */
const MAJOR_PARTS = ['chest', 'back', 'legs', 'shoulders']

/** 어깨팔 하나였던 옛 부위. 읽을 때 셋으로 나눈다. */
const LEGACY_ARMS = 'shoulders_arms'
const LEGACY_ARMS_PARTS = ['shoulders', 'triceps', 'biceps']

/** 부위마다 자주 하는 종목. group 이 부위라 고른 부위의 종목만 보인다. */
export const LIFTS: readonly Choice[] = [
  { value: 'bench', label: '벤치프레스', group: 'chest' },
  { value: 'incline_db', label: '인클라인 덤벨프레스', group: 'chest' },
  { value: 'chest_press', label: '체스트 프레스', group: 'chest' },
  { value: 'fly', label: '플라이', group: 'chest' },
  { value: 'dips', label: '딥스', group: 'chest' },
  { value: 'deadlift', label: '데드리프트', group: 'back' },
  { value: 'lat_pulldown', label: '랫풀다운', group: 'back' },
  { value: 'barbell_row', label: '바벨 로우', group: 'back' },
  { value: 'seated_row', label: '시티드 로우', group: 'back' },
  { value: 'pullup', label: '턱걸이', group: 'back' },
  { value: 'squat', label: '스쿼트', group: 'legs' },
  { value: 'leg_press', label: '레그 프레스', group: 'legs' },
  { value: 'lunge', label: '런지', group: 'legs' },
  { value: 'leg_extension', label: '레그 익스텐션', group: 'legs' },
  { value: 'leg_curl', label: '레그 컬', group: 'legs' },
  { value: 'ohp', label: '오버헤드 프레스', group: 'shoulders' },
  { value: 'db_shoulder_press', label: '덤벨 숄더프레스', group: 'shoulders' },
  { value: 'lateral_raise', label: '사이드 레터럴 레이즈', group: 'shoulders' },
  { value: 'rear_delt', label: '리어 델트 플라이', group: 'shoulders' },
  { value: 'pushdown', label: '트라이셉스 푸시다운', group: 'triceps' },
  { value: 'overhead_extension', label: '오버헤드 익스텐션', group: 'triceps' },
  { value: 'skull_crusher', label: '라잉 트라이셉스 익스텐션', group: 'triceps' },
  { value: 'kickback', label: '킥백', group: 'triceps' },
  { value: 'barbell_curl', label: '바벨 컬', group: 'biceps' },
  { value: 'db_curl', label: '덤벨 컬', group: 'biceps' },
  { value: 'hammer_curl', label: '해머 컬', group: 'biceps' },
  { value: 'preacher_curl', label: '프리처 컬', group: 'biceps' },
]

/** 다음 세트에서 올려 둘 무게. 덤벨은 한 칸이 작고, 머신과 바벨은 원판 한 쌍만큼. */
const DUMBBELL_LIFTS = new Set([
  'incline_db',
  'fly',
  'lunge',
  'db_shoulder_press',
  'lateral_raise',
  'rear_delt',
  'overhead_extension',
  'kickback',
  'db_curl',
  'hammer_curl',
])
const DUMBBELL_INCREMENT = 2.5
const DEFAULT_INCREMENT = 10

/** 키패드로 적는 무게라 0.5kg 간격이면 머신 눈금과 덤벨 대부분이 들어간다. */
export const WEIGHT: NumberRange = { min: 0, max: 300, step: 0.5, unit: 'kg', initial: 20, zeroLabel: '맨몸' }
const REPS: NumberRange = { min: 1, max: 50, step: 1, unit: '회', initial: 12 }
/** 시작 시각은 자정부터의 분. 05:00~23:50, 10분 간격. 처음 값은 저녁 7시. */
const START_AT: NumberRange = { min: 300, max: 1430, step: 10, unit: '', initial: 1140, format: 'time' }
const MINUTES: NumberRange = { min: 10, max: 240, step: 5, unit: '분', initial: 60 }
const CUSTOM_NAME_MAX = 20
/** 한 줄이 한 세트. 열 종목 여섯 세트까지. */
const MAX_SETS = 60
/** 옛 기록의 "세트 수" 한 칸을 줄로 펼칠 때의 상한. 옛 범위(1~10)와 같다. */
const LEGACY_SETS_MAX = 10
const MAX_FACTS = 2
const WEEK_DAYS = 7
/** 같은 무게로 이만큼 연속 채우면 증량을 제안한다. 오늘 포함. */
const OVERLOAD_STREAK = 3
/** 증량 제안 폭. 세트 사이에 올리는 폭과 달리 주 단위로 조금씩 올린다. */
const OVERLOAD_INCREMENT = 2.5

const KIND_LABEL: Record<string, string> = { gym: '헬스', cardio: '유산소', light: '가볍게', rest: '쉼' }

const labelOf = labelFor

function incrementOf(exercise: string): number {
  return DUMBBELL_LIFTS.has(exercise) ? DUMBBELL_INCREMENT : DEFAULT_INCREMENT
}

/** 다음 세트. 앞 세트를 복사하고 무게만 한 단계 올린다. 맨몸은 그대로. */
function nextLift(prev: Entry): Entry {
  const weight = Number(prev.weight)
  if (!Number.isFinite(weight) || weight === 0) return { ...prev }
  return { ...prev, weight: Math.min(WEIGHT.max, weight + incrementOf(String(prev.exercise))) }
}

/**
 * 옛 모양을 지금 모양으로. 어깨팔은 어깨, 삼두, 이두로 나누고,
 * "무게 × 반복 × 세트 수" 한 줄은 같은 세트 여러 줄로 펼친다. 지금 모양은 그대로 둔다.
 */
function upgradeExercise(raw: Record<string, unknown>): Record<string, unknown> {
  const next = { ...raw }
  if (Array.isArray(raw.parts) && raw.parts.includes(LEGACY_ARMS)) {
    next.parts = [...new Set(raw.parts.flatMap((part) => (part === LEGACY_ARMS ? LEGACY_ARMS_PARTS : [part])))]
  }
  if (Array.isArray(raw.lifts)) {
    next.lifts = raw.lifts.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return [item]
      const { sets, ...entry } = item as Record<string, unknown>
      const custom = typeof entry.exercise === 'string' ? parseCustom(entry.exercise) : null
      if (custom?.group === LEGACY_ARMS) entry.exercise = `custom:shoulders:${custom.name}`
      if (sets === undefined) return [entry]
      const count = typeof sets === 'number' && Number.isInteger(sets) ? Math.min(Math.max(sets, 1), LEGACY_SETS_MAX) : 1
      return Array.from({ length: count }, () => ({ ...entry }))
    })
  }
  return next
}

function partsOf(answer: Answer): string[] {
  return Array.isArray(answer.parts) ? answer.parts.filter((part): part is string => typeof part === 'string') : []
}

/** 한 세트. */
type Lift = { exercise: string; weight: number; reps: number }

function liftsOf(answer: Answer): Lift[] {
  if (!Array.isArray(answer.lifts)) return []
  return answer.lifts
    .filter((item): item is Entry => typeof item === 'object')
    .map((entry) => ({
      exercise: String(entry.exercise),
      weight: Number(entry.weight),
      reps: Number(entry.reps),
    }))
}

/** 더 무거운 세트, 무게가 같으면 더 많이 든 세트. */
function heavier(a: Lift, b: Lift): Lift {
  if (a.weight !== b.weight) return a.weight > b.weight ? a : b
  return a.reps >= b.reps ? a : b
}

/** 종목마다 그날 가장 무거운 세트. 처음 한 순서대로. */
function topSets(answer: Answer): Lift[] {
  const tops = new Map<string, Lift>()
  for (const lift of liftsOf(answer)) {
    const best = tops.get(lift.exercise)
    tops.set(lift.exercise, best ? heavier(best, lift) : lift)
  }
  return [...tops.values()]
}

/** 받침 있는 말 뒤에는 은, 없으면 는. "등은", "가슴은"이 아니라 "가슴는"이 되지 않게. */
function topic(word: string): string {
  const last = word.charCodeAt(word.length - 1)
  const hangul = last >= 0xac00 && last <= 0xd7a3
  return hangul && (last - 0xac00) % 28 !== 0 ? `${word}은` : `${word}는`
}

/** YYYY-MM-DD 끼리 며칠 차이인가. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** 이 종목을 한 이전 날들의 탑 세트, 최신순. */
function previousSessions(exercise: string, history: HistoryLog[]): Lift[] {
  const sessions: Lift[] = []
  for (const log of [...history].reverse()) {
    const top = topSets(log.answer).find((lift) => lift.exercise === exercise)
    if (top) sessions.push(top)
  }
  return sessions
}

function overloadFact(lift: Lift, previous: Lift[]): string | null {
  if (lift.weight === 0) return null
  const streak = previous.slice(0, OVERLOAD_STREAK - 1)
  if (streak.length < OVERLOAD_STREAK - 1) return null
  const held = streak.every((prev) => prev.weight === lift.weight && prev.reps >= lift.reps)
  const next = lift.weight + OVERLOAD_INCREMENT
  if (!held || next > WEIGHT.max) return null
  const name = labelOf(LIFTS, lift.exercise)
  return `${name} ${lift.weight}kg로 ${OVERLOAD_STREAK}번 연속 ${lift.reps}회를 채웠어요. 다음엔 ${next}kg 어때요?`
}

function recordFact(lift: Lift, previous: Lift[]): string | null {
  if (previous.length === 0 || lift.weight === 0) return null
  const best = Math.max(...previous.map((prev) => prev.weight))
  if (lift.weight <= best) return null
  return `${labelOf(LIFTS, lift.exercise)} 최고 무게예요. 전에는 ${best}kg였어요.`
}

/** 최근 7일(오늘 포함) 헬스에서 한 번도 안 한 큰 부위. 기록이 쌓이기 전에는 말하지 않는다. */
function missedPartsFact(answer: Answer, history: HistoryLog[], today: string): string | null {
  const recent = history.filter((log) => daysBetween(log.loggedOn, today) < WEEK_DAYS)
  if (recent.length < 2) return null
  const trained = new Set([...partsOf(answer), ...recent.flatMap((log) => partsOf(log.answer))])
  const major = EXERCISE_PARTS.filter((part) => MAJOR_PARTS.includes(part.value))
  const missed = major.filter((part) => !trained.has(part.value)).map((part) => part.label)
  if (missed.length === 0 || missed.length === major.length) return null
  return `최근 ${WEEK_DAYS}일 동안 ${topic(missed.join(', '))} 안 했어요.`
}

/** 증량 제안, 최고 무게, 빠진 부위 순. 한 번에 두 가지까지만 말한다. 종목은 그날 탑 세트로 본다. */
export function exerciseFeedback(answer: Answer, history: HistoryLog[], today: string): string[] {
  if (answer.kind !== 'gym') return []
  const facts: string[] = []
  const tops = topSets(answer)

  for (const lift of tops) {
    const fact = overloadFact(lift, previousSessions(lift.exercise, history))
    if (fact) {
      facts.push(fact)
      break
    }
  }
  for (const lift of tops) {
    const fact = recordFact(lift, previousSessions(lift.exercise, history))
    if (fact) {
      facts.push(fact)
      break
    }
  }
  const missed = missedPartsFact(answer, history, today)
  if (missed) facts.push(missed)
  return facts.slice(0, MAX_FACTS)
}

/** "가슴 하체 루틴", "유산소 40분". 확인 질문이 30자 안에 들어가게 짧게. */
export function exerciseBrief(answer: Answer): string {
  const kind = String(answer.kind)
  if (kind === 'gym') {
    const parts = partsOf(answer).map((part) => labelOf(EXERCISE_PARTS, part))
    return parts.length > 0 ? `${parts.join(' ')} 루틴` : '헬스'
  }
  if (kind === 'cardio' && typeof answer.minutes === 'number') return `유산소 ${answer.minutes}분`
  return KIND_LABEL[kind] ?? kind
}

/** 같은 부위 조합이면 같은 루틴. 무게와 횟수는 날마다 달라도 된다. */
export function exerciseRoutineKey(answer: Answer): string {
  const kind = String(answer.kind)
  return kind === 'gym' ? `gym:${partsOf(answer).join(',')}` : kind
}

function summarizeExercise(answers: Answer[]): string {
  const kinds = { gym: 0, cardio: 0, light: 0, rest: 0 }
  const parts = new Map<string, number>()
  for (const answer of answers) {
    if (typeof answer.kind === 'string' && answer.kind in kinds) kinds[answer.kind as keyof typeof kinds] += 1
    for (const part of partsOf(answer)) parts.set(part, (parts.get(part) ?? 0) + 1)
  }
  if (answers.length === 0) return '운동 기록이 없었어요'

  const kindLine = (Object.keys(kinds) as (keyof typeof kinds)[])
    .filter((kind) => kinds[kind] > 0)
    .map((kind) => `${KIND_LABEL[kind]} ${kinds[kind]}번`)
    .join(', ')
  if (kinds.gym === 0) return `운동 ${kindLine}`

  const missed = EXERCISE_PARTS.filter((part) => MAJOR_PARTS.includes(part.value) && !parts.get(part.value))
  const partLine =
    missed.length === 0 ? '큰 부위 다 챙겼어요' : `${topic(missed.map((part) => part.label).join(', '))} 없었어요`
  return `운동 ${kindLine}. ${partLine}`
}

export const EXERCISE: TrackDef = {
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
  feedback: exerciseFeedback,
  brief: exerciseBrief,
  routineKey: exerciseRoutineKey,
  upgrade: upgradeExercise,
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
      columns: 3,
      multi: true,
      when: { kind: ['gym'] },
      toneFrom: 'kind',
      choices: EXERCISE_PARTS,
    },
    {
      key: 'lifts',
      question: '뭐 했어요?',
      kind: 'entries',
      when: { kind: ['gym'] },
      maxEntries: MAX_SETS,
      nextEntry: nextLift,
      rowLabel: '세트',
      fields: [
        {
          key: 'exercise',
          label: '종목',
          kind: 'choice',
          choices: LIFTS,
          groupFrom: 'parts',
          custom: { maxLength: CUSTOM_NAME_MAX },
        },
        { key: 'weight', label: '무게', kind: 'number', ...WEIGHT },
        { key: 'reps', label: '반복', kind: 'number', ...REPS },
      ],
    },
    {
      key: 'startAt',
      question: '언제 했어요?',
      label: '시작',
      kind: 'number',
      screen: 'time',
      when: { kind: ['gym', 'cardio'] },
      ...START_AT,
    },
    {
      key: 'minutes',
      question: '얼마나 했어요?',
      label: '얼마나',
      kind: 'number',
      screen: 'time',
      when: { kind: ['gym', 'cardio'] },
      ...MINUTES,
    },
    {
      key: 'intensity',
      question: '어땠어요?',
      columns: 3,
      when: { kind: ['cardio'] },
      toneFrom: 'kind',
      choices: [
        { value: 'low', label: '가벼움', level: 1 },
        { value: 'mid', label: '적당', level: 2 },
        { value: 'high', label: '빡셈', level: 3 },
      ],
    },
  ],
}
