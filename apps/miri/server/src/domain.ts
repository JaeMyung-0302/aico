/**
 * 서버와 클라이언트가 공유하는 값 정의. 옵션에 없는 값은 저장하지 않는다.
 * 분야별 선택지는 tracks.ts 카탈로그가 정본이고 여기서는 그대로 내보낸다.
 */

export {
  TRACK_IDS,
  TRACKS,
  TONES,
  isTrackId,
  isChoiceStep,
  isStepActive,
  normalizeAnswer,
  normalizeNumber,
  describeAnswer,
  describeEntries,
  describeNumber,
  minutesToClock,
  describeValue,
  primaryStep,
  toneOf,
  type Answer,
  type AnswerValue,
  type Choice,
  type ChoiceStepDef,
  type EntriesStepDef,
  type Entry,
  type EntryField,
  type NumberRange,
  type NumberStepDef,
  type StepDef,
  type Tone,
  type TrackDef,
  type TrackId,
} from './tracks.ts'
export { cleanCustomName, customValue, parseCustom } from './choices.ts'
import { TRACK_IDS, TRACKS, type TrackId } from './tracks.ts'

/** 빠른 선택 프리셋. 이 밖의 시각은 10분 단위로 직접 고른다. */
export const NOTIFY_PRESETS = ['07:30', '12:30', '18:30', '21:00'] as const
export const NOTIFY_STEP_MINUTES = 10

const NOTIFY_TIME = /^([01]\d|2[0-3]):[0-5]0$/

/** HH:MM 이고 분이 10의 배수인가. cron 이 10분마다 돌기 때문이다. */
export function isNotifyTime(value: unknown): value is string {
  return typeof value === 'string' && NOTIFY_TIME.test(value)
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 0~6(일~토) 중복 없는 배열인가. */
export function isOffDays(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    new Set(value).size === value.length
  )
}

export function offDaysToText(days: number[]): string {
  return [...days].sort((a, b) => a - b).join(',')
}

export function textToOffDays(text: string): number[] {
  if (!text) return []
  return text
    .split(',')
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
}

/** 사용자의 트랙 설정 한 건. 서버 응답과 클라이언트 상태가 같은 모양을 쓴다. */
export type TrackSettings = {
  track: TrackId
  enabled: boolean
  notifyAt: string
  remind: boolean
  offDays: number[]
}

/** 아직 설정이 없는 트랙의 기본값. 켜지지 않은 상태로 시작한다. */
export function defaultTrackSettings(track: TrackId): TrackSettings {
  return { track, enabled: false, notifyAt: TRACKS[track].defaultNotifyAt, remind: true, offDays: [] }
}

/** 카탈로그 순서로 5개 전부. 설정이 있는 트랙은 그 값, 없는 트랙은 기본값. */
export function fullTrackSettings(known: TrackSettings[]): TrackSettings[] {
  return TRACK_IDS.map((track) => known.find((item) => item.track === track) ?? defaultTrackSettings(track))
}
