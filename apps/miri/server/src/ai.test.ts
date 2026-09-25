import { describe, expect, it } from 'vitest'
import { acceptDailyText, acceptWeeklyText, dailyPrompt } from './ai.ts'
import type { QuestionContext } from './dispatch.ts'
import { TRACKS } from './tracks.ts'

describe('acceptDailyText', () => {
  it('accepts a short single-line question', () => {
    expect(acceptDailyText('오늘 몸 좀 움직였어요?', null)).toBe(true)
  })

  it('rejects empty, long, multi-line, or non-question output', () => {
    expect(acceptDailyText('', null)).toBe(false)
    expect(acceptDailyText('오'.repeat(35) + '?', null)).toBe(false)
    expect(acceptDailyText('오늘은요?\n운동했어요?', null)).toBe(false)
    expect(acceptDailyText('오늘 운동 기록해요.', null)).toBe(false)
    expect(acceptDailyText('운동했어요!?', null)).toBe(false)
  })

  it('requires the prediction text verbatim when there is one', () => {
    expect(acceptDailyText('오늘도 헬스, 가슴, 적당?', '헬스, 가슴, 적당')).toBe(true)
    expect(acceptDailyText('오늘도 가슴 운동?', '헬스, 가슴, 적당')).toBe(false)
  })
})

describe('acceptWeeklyText', () => {
  it('allows up to three lines without exclamation marks', () => {
    expect(acceptWeeklyText('운동은 꾸준했어요.\n수면이 짧은 날이 있었어요.')).toBe(true)
    expect(acceptWeeklyText('a\nb\nc\nd')).toBe(false)
    expect(acceptWeeklyText('대단해요!')).toBe(false)
    expect(acceptWeeklyText('')).toBe(false)
  })
})

describe('dailyPrompt', () => {
  const base: QuestionContext = {
    userId: 'u1',
    track: TRACKS.exercise,
    prediction: null,
    recent: [],
    weekDays: 0,
    dayIndex: 0,
    salt: 0,
  }

  it('states the absence of a prediction and history', () => {
    const prompt = dailyPrompt(base)
    expect(prompt).toContain('트랙: 운동')
    expect(prompt).toContain('예측: 없음')
    expect(prompt).toContain('최근 7일 답: 없음')
  })

  it('quotes the prediction verbatim so the model can echo it', () => {
    const prompt = dailyPrompt({
      ...base,
      prediction: { kind: 'gym', parts: ['chest'], intensity: 'mid' },
      recent: ['쉼', '유산소, 가벼움'],
      weekDays: 3,
    })
    expect(prompt).toContain('예측: "헬스, 가슴, 적당"')
    expect(prompt).toContain('최근 7일 답: 쉼, 유산소, 가벼움')
    expect(prompt).toContain('이번 주 기록한 날: 3일')
  })
})
