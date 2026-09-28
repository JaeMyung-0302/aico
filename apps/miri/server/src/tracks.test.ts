import { describe, expect, it } from 'vitest'
import {
  confirmQuestionText,
  describeAnswer,
  isStepActive,
  normalizeAnswer,
  openQuestionText,
  primaryStep,
  summarizeTrackWeek,
  toneOf,
  TRACK_IDS,
  TRACKS,
  describeValue,
  normalizeNumber,
  type Answer,
  type TrackDef,
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
      const primary = primaryStep(track)
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

/** 새 단계 종류를 쓰는 트랙이 아직 없어서 테스트 전용으로 만든다. */
const lifting: TrackDef = {
  id: 'exercise',
  name: '웨이트',
  templates: ['오늘은요?'],
  confirmTemplates: ['{x}?'],
  defaultNotifyAt: '21:00',
  primary: 'kind',
  steps: [
    {
      key: 'kind',
      question: '뭐 했어요?',
      columns: 2,
      choices: [
        { value: 'gym', label: '헬스', tone: 'blue' },
        { value: 'run', label: '달리기', tone: 'teal' },
      ],
    },
    {
      key: 'lifts',
      question: '종목은요?',
      kind: 'entries',
      maxEntries: 3,
      when: { kind: ['gym'] },
      fields: [
        {
          key: 'exercise',
          label: '종목',
          kind: 'choice',
          choices: [
            { value: 'bench', label: '벤치프레스' },
            { value: 'squat', label: '스쿼트' },
          ],
        },
        { key: 'weight', label: '무게', kind: 'number', min: 0, max: 300, step: 2.5, unit: 'kg' },
        { key: 'reps', label: '반복', kind: 'number', min: 1, max: 30, step: 1, unit: '회' },
      ],
    },
    { key: 'minutes', question: '몇 분이요?', kind: 'number', min: 10, max: 180, step: 5, unit: '분', when: { kind: ['run'] } },
  ],
}

describe('normalizeNumber', () => {
  const kg = { min: 0, max: 300, step: 2.5, unit: 'kg' }

  it('accepts values on the grid, including fractional steps', () => {
    expect(normalizeNumber(kg, 62.5)).toBe(62.5)
    expect(normalizeNumber(kg, 0)).toBe(0)
    expect(normalizeNumber(kg, 300)).toBe(300)
  })

  it('rejects off-grid, out-of-range, and non-numbers', () => {
    expect(normalizeNumber(kg, 61)).toBeNull()
    expect(normalizeNumber(kg, -2.5)).toBeNull()
    expect(normalizeNumber(kg, 302.5)).toBeNull()
    expect(normalizeNumber(kg, '60')).toBeNull()
    expect(normalizeNumber(kg, Number.NaN)).toBeNull()
  })
})

describe('number and entries steps', () => {
  const bench = { exercise: 'bench', weight: 60, reps: 5 }
  const squat = { exercise: 'squat', weight: 80, reps: 5 }

  it('keeps valid entries and drops unknown fields', () => {
    expect(normalizeAnswer(lifting, { kind: 'gym', lifts: [{ ...bench, note: 'x' }, squat] })).toEqual({
      kind: 'gym',
      lifts: [bench, squat],
    })
  })

  it('strict rejects a bad entry, an empty list, or too many entries', () => {
    expect(normalizeAnswer(lifting, { kind: 'gym', lifts: [bench, { ...squat, weight: 81 }] })).toBeNull()
    expect(normalizeAnswer(lifting, { kind: 'gym', lifts: [] })).toBeNull()
    expect(normalizeAnswer(lifting, { kind: 'gym', lifts: [bench, bench, bench, bench] })).toBeNull()
    expect(normalizeAnswer(lifting, { kind: 'gym', lifts: [{ exercise: 'bench', weight: 60 }] })).toBeNull()
  })

  it('lenient keeps only the good entries when reading', () => {
    expect(
      normalizeAnswer(lifting, { kind: 'gym', lifts: [bench, { ...squat, exercise: 'deadlift' }] }, 'lenient'),
    ).toEqual({ kind: 'gym', lifts: [bench] })
  })

  it('validates a number step behind a condition', () => {
    expect(normalizeAnswer(lifting, { kind: 'run', minutes: 35 })).toEqual({ kind: 'run', minutes: 35 })
    expect(normalizeAnswer(lifting, { kind: 'run', minutes: 33 })).toBeNull()
  })

  it('describes numbers with units and entries line by line', () => {
    expect(describeAnswer(lifting, { kind: 'gym', lifts: [bench, squat] })).toBe(
      '헬스, 벤치프레스 60kg 5회 / 스쿼트 80kg 5회',
    )
    expect(describeValue(lifting.steps[2]!, 35)).toBe('35분')
    expect(toneOf(lifting, { kind: 'run', minutes: 35 })).toBe('teal')
  })
})
