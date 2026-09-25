import { describe, expect, it } from 'vitest'
import type { QuestionRow } from './db.ts'
import { buildInbox } from './inbox.ts'

const base: QuestionRow = {
  id: 'q1',
  user_id: 'u1',
  track: 'exercise',
  intent: 'daily',
  text: '오늘 몸 어떻게 썼어요?',
  prediction: null,
  asked_on: '2026-09-21',
  asked_at: '2026-09-21T12:00:00.000Z',
  reminded: 0,
  answered_at: null,
}

describe('buildInbox', () => {
  it('is empty when there is nothing today', () => {
    expect(buildInbox([])).toEqual([])
  })

  it('offers the quick answer and open when there is no prediction', () => {
    const [notification] = buildInbox([base])
    expect(notification?.tag).toBe('miri-exercise')
    expect(notification?.actions.map((action) => action.action)).toEqual(['quick', 'open'])
    expect(notification?.quick).toEqual({ kind: 'rest' })
    expect(notification?.prediction).toBeNull()
    expect(notification?.body).toBe('운동, 3초면 끝나요')
    expect(notification?.url).toBe('/?from=push&track=exercise')
  })

  it('offers only open for a track without a quick answer', () => {
    const [notification] = buildInbox([{ ...base, track: 'sleep' }])
    expect(notification?.actions.map((action) => action.action)).toEqual(['open'])
  })

  it('offers accept when a prediction exists and carries it along', () => {
    const question: QuestionRow = {
      ...base,
      text: '오늘도 헬스, 가슴, 적당?',
      prediction: JSON.stringify({ kind: 'gym', parts: ['chest'], intensity: 'mid' }),
    }
    const [notification] = buildInbox([question])
    expect(notification?.actions[0]).toEqual({ action: 'accept', title: '그래요' })
    expect(notification?.prediction).toEqual({ kind: 'gym', parts: ['chest'], intensity: 'mid' })
    expect(notification?.quick).toBeNull()
  })

  it('changes the body once a reminder went out', () => {
    expect(buildInbox([{ ...base, reminded: 1 }])[0]?.body).toBe('아직이에요. 운동, 3초면 끝나요')
  })

  it('drops answered daily questions, unknown tracks, and keeps the weekly one', () => {
    const weekly: QuestionRow = { ...base, id: 'q2', track: 'all', intent: 'weekly', text: '운동 헬스 2번\n수면 5일' }
    const answered: QuestionRow = { ...base, answered_at: '2026-09-21T12:30:00.000Z' }
    const unknown: QuestionRow = { ...base, id: 'q3', track: 'water' }
    const inbox = buildInbox([answered, unknown, weekly])
    expect(inbox).toHaveLength(1)
    expect(inbox[0]?.tag).toBe('miri-weekly')
    expect(inbox[0]?.url).toBe('/?from=push&view=flow')
  })
})
