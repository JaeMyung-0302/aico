import { describe, expect, it } from 'vitest'
import type { QuestionRow } from './db.ts'
import { buildInbox } from './inbox.ts'

const base: QuestionRow = {
  id: 'q1',
  user_id: 'u1',
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

  it('offers rest and open when there is no prediction', () => {
    const [notification] = buildInbox([base])
    expect(notification?.actions.map((action) => action.action)).toEqual(['rest', 'open'])
    expect(notification?.prediction).toBeNull()
    expect(notification?.body).toBe('3초면 끝나요')
  })

  it('offers accept when a prediction exists and carries it along', () => {
    const question: QuestionRow = {
      ...base,
      text: '오늘도 헬스, 가슴, 적당?',
      prediction: JSON.stringify({ kind: 'gym', parts: ['chest'], intensity: 'normal' }),
    }
    const [notification] = buildInbox([question])
    expect(notification?.title).toBe('오늘도 헬스, 가슴, 적당?')
    expect(notification?.actions[0]).toEqual({ action: 'accept', title: '그래요' })
    expect(notification?.prediction).toEqual({ kind: 'gym', parts: ['chest'], intensity: 'normal' })
  })

  it('changes the body once a reminder went out', () => {
    expect(buildInbox([{ ...base, reminded: 1 }])[0]?.body).toBe('아직이에요. 3초면 끝나요')
  })

  it('drops an answered daily question but keeps the weekly one', () => {
    const weekly: QuestionRow = { ...base, id: 'q2', intent: 'weekly', text: '이번 주 헬스 2번' }
    const answered: QuestionRow = { ...base, answered_at: '2026-09-21T12:30:00.000Z' }
    const inbox = buildInbox([answered, weekly])
    expect(inbox).toHaveLength(1)
    expect(inbox[0]?.tag).toBe('miri-weekly')
    expect(inbox[0]?.url).toBe('/?from=push&view=flow')
  })
})
