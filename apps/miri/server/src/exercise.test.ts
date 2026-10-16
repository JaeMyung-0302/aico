import { describe, expect, it } from 'vitest'
import { exerciseBrief, exerciseFeedback, exerciseRoutineKey } from './exercise.ts'
import { predictFor } from './predict.ts'
import { confirmQuestionText, TRACKS, type Answer, type HistoryLog } from './tracks.ts'

const TODAY = '2026-09-29'
const lift = (exercise: string, weight: number, reps = 5) => ({ exercise, weight, reps })
const gym = (parts: string[], lifts: ReturnType<typeof lift>[]): Answer => ({
  kind: 'gym',
  parts,
  lifts,
  startAt: 1140,
  minutes: 60,
})
const on = (loggedOn: string, answer: Answer): HistoryLog => ({ loggedOn, answer })

describe('exerciseFeedback', () => {
  it('says nothing for rest, cardio, or a first session', () => {
    expect(exerciseFeedback({ kind: 'rest' }, [], TODAY)).toEqual([])
    expect(exerciseFeedback({ kind: 'cardio', minutes: 30, intensity: 'mid' }, [], TODAY)).toEqual([])
    expect(exerciseFeedback(gym(['chest'], [lift('bench', 60)]), [], TODAY)).toEqual([])
  })

  it('suggests the next weight after three sessions held at the same load', () => {
    const history = [
      on('2026-09-15', gym(['chest'], [lift('bench', 60)])),
      on('2026-09-22', gym(['chest'], [lift('bench', 60, 6)])),
    ]
    expect(exerciseFeedback(gym(['chest'], [lift('bench', 60)]), history, TODAY)[0]).toBe(
      '벤치프레스 60kg로 3번 연속 5회를 채웠어요. 다음엔 62.5kg 어때요?',
    )
  })

  it('does not suggest more weight when an earlier session fell short', () => {
    const history = [
      on('2026-09-15', gym(['chest'], [lift('bench', 60, 4)])),
      on('2026-09-22', gym(['chest'], [lift('bench', 60)])),
    ]
    expect(exerciseFeedback(gym(['chest'], [lift('bench', 60)]), history, TODAY)).toEqual([])
  })

  it('calls out a new best weight', () => {
    const history = [on('2026-09-22', gym(['legs'], [lift('squat', 80)]))]
    expect(exerciseFeedback(gym(['legs'], [lift('squat', 85)]), history, TODAY)).toEqual([
      '스쿼트 최고 무게예요. 전에는 80kg였어요.',
    ])
  })

  it('names parts skipped in the last seven days with the right particle', () => {
    const history = [
      on('2026-09-10', gym(['back'], [lift('deadlift', 100)])),
      on('2026-09-25', gym(['legs'], [lift('squat', 80)])),
      on('2026-09-27', gym(['shoulders'], [lift('ohp', 40)])),
    ]
    expect(exerciseFeedback(gym(['chest'], [lift('bench', 60)]), history, TODAY)).toEqual([
      '최근 7일 동안 등은 안 했어요.',
    ])
    // 앞선 두 번은 4회에 그쳐 증량 조건이 안 되고, 무게도 같아 최고 기록도 아니다.
    const onlyLegs = [
      on('2026-09-25', gym(['legs'], [lift('squat', 80, 4)])),
      on('2026-09-27', gym(['legs'], [lift('squat', 80, 4)])),
    ]
    expect(exerciseFeedback(gym(['legs'], [lift('squat', 80)]), onlyLegs, TODAY)).toEqual([
      '최근 7일 동안 가슴, 등, 어깨는 안 했어요.',
    ])
  })

  it('keeps at most two facts', () => {
    const history = [
      on('2026-09-24', gym(['chest'], [lift('bench', 60), lift('fly', 10)])),
      on('2026-09-26', gym(['chest'], [lift('bench', 60), lift('fly', 10)])),
    ]
    const facts = exerciseFeedback(gym(['chest'], [lift('bench', 60), lift('fly', 12.5)]), history, TODAY)
    expect(facts).toHaveLength(2)
    expect(facts[0]).toContain('62.5kg')
    expect(facts[1]).toContain('플라이 최고 무게')
  })

  it('never suggests more weight for bodyweight work', () => {
    const history = [on('2026-09-15', gym(['back'], [lift('pullup', 0)])), on('2026-09-22', gym(['back'], [lift('pullup', 0)]))]
    expect(exerciseFeedback(gym(['back'], [lift('pullup', 0)]), history, TODAY)).toEqual([])
  })
})

describe('brief and confirm wording', () => {
  it('names the routine, not every lift, so the question stays short', () => {
    const chestLegs = gym(['chest', 'legs'], [lift('bench', 60), lift('squat', 80)])
    expect(exerciseBrief(chestLegs)).toBe('가슴 하체 루틴')
    expect(exerciseBrief({ kind: 'cardio', minutes: 40, intensity: 'mid' })).toBe('유산소 40분')
    expect(exerciseBrief({ kind: 'rest' })).toBe('쉼')
    expect(confirmQuestionText(TRACKS.exercise, chestLegs, 0)).toBe('오늘도 가슴 하체 루틴?')
  })
})

describe('routine prediction', () => {
  it('groups by parts and proposes the latest session of the winning routine', () => {
    const logs = [
      on('2026-09-22', gym(['chest'], [lift('bench', 62.5)])),
      on('2026-09-15', gym(['chest'], [lift('bench', 60)])),
      on('2026-09-08', { kind: 'rest' }),
    ]
    expect(exerciseRoutineKey(logs[0]!.answer)).toBe('gym:chest')
    expect(predictFor(TRACKS.exercise, logs)).toEqual(gym(['chest'], [lift('bench', 62.5)]))
  })

  it('skips predictions built from logs in the old format', () => {
    const old = [
      on('2026-09-22', { kind: 'gym', parts: ['chest'] }),
      on('2026-09-15', { kind: 'gym', parts: ['chest'] }),
    ]
    expect(predictFor(TRACKS.exercise, old)).toBeNull()
  })
})
