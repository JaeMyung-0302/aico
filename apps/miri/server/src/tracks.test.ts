import { describe, expect, it } from 'vitest'
import {
  confirmQuestionText,
  describeAnswer,
  isStepActive,
  normalizeAnswer,
  openQuestionText,
  summarizeTrackWeek,
  toneOf,
  TRACK_IDS,
  TRACKS,
  type Answer,
} from './tracks.ts'

const exercise = TRACKS.exercise
const sleep = TRACKS.sleep

describe('catalog', () => {
  it('every track has a primary step, templates, and a valid default time', () => {
    for (const id of TRACK_IDS) {
      const track = TRACKS[id]
      expect(track.steps.some((step) => step.key === track.primary)).toBe(true)
      expect(track.templates.length).toBeGreaterThanOrEqual(3)
      expect(track.confirmTemplates.every((t) => t.includes('{x}'))).toBe(true)
      expect(track.defaultNotifyAt).toMatch(/^([01]\d|2[0-3]):[0-5]0$/)
    }
  })

  it('first-step choices carry a tone so days can be colored', () => {
    for (const id of TRACK_IDS) {
      const track = TRACKS[id]
      const primary = track.steps.find((step) => step.key === track.primary)
      expect(primary?.choices.every((choice) => choice.tone)).toBe(true)
    }
  })
})

describe('normalizeAnswer (strict)', () => {
  it('keeps the exercise flow: rest is one tap', () => {
    expect(normalizeAnswer(exercise, { kind: 'rest' })).toEqual({ kind: 'rest' })
    expect(normalizeAnswer(exercise, { kind: 'rest', intensity: 'high' })).toEqual({ kind: 'rest' })
  })

  it('requires parts and intensity for gym, sorts and dedupes parts', () => {
    expect(normalizeAnswer(exercise, { kind: 'gym' })).toBeNull()
    expect(normalizeAnswer(exercise, { kind: 'gym', parts: ['legs', 'chest', 'legs', 'abs'] })).toBeNull()
    expect(
      normalizeAnswer(exercise, { kind: 'gym', parts: ['legs', 'chest', 'legs', 'abs'], intensity: 'mid' }),
    ).toEqual({ kind: 'gym', parts: ['chest', 'legs'], intensity: 'mid' })
  })

  it('asks intensity for cardio but not parts', () => {
    expect(normalizeAnswer(exercise, { kind: 'cardio', parts: ['chest'], intensity: 'low' })).toEqual({
      kind: 'cardio',
      intensity: 'low',
    })
  })

  it('rejects unknown kinds and non-objects', () => {
    expect(normalizeAnswer(exercise, { kind: 'swim' })).toBeNull()
    expect(normalizeAnswer(exercise, null)).toBeNull()
    expect(normalizeAnswer(exercise, 'gym')).toBeNull()
  })

  it('handles a two-step track without conditions', () => {
    expect(normalizeAnswer(sleep, { hours: 'h7to8', fresh: 'high' })).toEqual({ hours: 'h7to8', fresh: 'high' })
    expect(normalizeAnswer(sleep, { hours: 'h7to8' })).toBeNull()
  })
})

describe('normalizeAnswer (lenient)', () => {
  it('keeps what is valid and skips missing steps', () => {
    expect(normalizeAnswer(exercise, { kind: 'gym', parts: [] }, 'lenient')).toEqual({ kind: 'gym' })
    expect(normalizeAnswer(exercise, { kind: 'gym', parts: ['chest'], intensity: null }, 'lenient')).toEqual({
      kind: 'gym',
      parts: ['chest'],
    })
  })
})

describe('isStepActive', () => {
  it('follows the when condition', () => {
    const parts = exercise.steps[1]!
    expect(isStepActive(parts, { kind: 'gym' })).toBe(true)
    expect(isStepActive(parts, { kind: 'cardio' })).toBe(false)
    expect(isStepActive(parts, {})).toBe(false)
  })
})

describe('describeAnswer and toneOf', () => {
  it('reads like a sentence fragment', () => {
    expect(describeAnswer(exercise, { kind: 'gym', parts: ['chest', 'legs'], intensity: 'mid' })).toBe(
      '헬스, 가슴 하체, 적당',
    )
    expect(describeAnswer(sleep, { hours: 'under5', fresh: 'low' })).toBe('5시간 미만, 무거움')
  })

  it('colors the day by the primary step', () => {
    expect(toneOf(exercise, { kind: 'cardio' })).toBe('teal')
    expect(toneOf(sleep, { hours: 'over9', fresh: 'high' })).toBe('blue')
    expect(toneOf(sleep, {})).toBeNull()
  })
})

describe('question wording rotation', () => {
  it('changes with the day and wraps around', () => {
    const first = openQuestionText(exercise, 0)
    const second = openQuestionText(exercise, 1)
    expect(first).not.toBe(second)
    expect(openQuestionText(exercise, exercise.templates.length)).toBe(first)
    expect(openQuestionText(exercise, -1)).toBe(exercise.templates[exercise.templates.length - 1])
  })

  it('fills the prediction into the confirm template', () => {
    expect(confirmQuestionText(exercise, { kind: 'rest' }, 0)).toBe('오늘도 쉼?')
    expect(confirmQuestionText(exercise, { kind: 'rest' }, 1)).toBe('쉼, 오늘도요?')
  })
})

describe('summarizeTrackWeek', () => {
  it('uses the exercise-specific summary with missed parts', () => {
    const answers: Answer[] = [
      { kind: 'gym', parts: ['chest'], intensity: 'mid' },
      { kind: 'gym', parts: ['back', 'chest'], intensity: 'high' },
      { kind: 'cardio', intensity: 'low' },
    ]
    expect(summarizeTrackWeek(exercise, answers)).toBe('운동 헬스 2번, 유산소 1번. 하체, 어깨팔은 없었어요')
    expect(summarizeTrackWeek(exercise, [])).toBe('운동 기록이 없었어요')
  })

  it('uses the generic summary elsewhere', () => {
    const answers = [
      { hours: 'h7to8', fresh: 'high' },
      { hours: 'h7to8', fresh: 'mid' },
      { hours: 'under5', fresh: 'low' },
    ]
    expect(summarizeTrackWeek(sleep, answers)).toBe('수면 3일, 7~8시간이 2번')
    expect(summarizeTrackWeek(TRACKS.mood, [])).toBe('기분 기록이 없었어요')
  })
})
