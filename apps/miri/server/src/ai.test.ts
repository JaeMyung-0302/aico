import { describe, expect, it } from 'vitest'
import { acceptDailyText, acceptFeedbackText, acceptWeeklyText, dailyPrompt, feedbackPrompt } from './ai.ts'
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
      prediction: { kind: 'gym', parts: ['chest'], lifts: [{ exercise: 'bench', weight: 60, reps: 5 }] },
      recent: ['쉼', '유산소, 가벼움'],
      weekDays: 3,
    })
    // 예측은 루틴 이름으로 짧게 넣는다. 종목을 다 풀면 30자 문구에 들어가지 않는다.
    expect(prompt).toContain('예측: "가슴 루틴"')
    expect(prompt).toContain('최근 7일 답: 쉼, 유산소, 가벼움')
    expect(prompt).toContain('이번 주 기록한 날: 3일')
  })
})

describe('acceptFeedbackText', () => {
  const facts = ['벤치프레스 60kg 5회를 3번 연속 채웠어요.', '이번 주 등은 없었어요.']

  it('accepts one or two short sentences built from the facts', () => {
    expect(acceptFeedbackText('벤치 60kg 5회를 3번 연속 채웠어요. 다음엔 등도 챙겨봐요.', facts)).toBe(true)
  })

  it('rejects numbers the rules never stated', () => {
    expect(acceptFeedbackText('다음엔 62.5kg로 올려봐요.', facts)).toBe(false)
  })

  it('rejects empty, long, multi-line, or exclaiming output', () => {
    expect(acceptFeedbackText('', facts)).toBe(false)
    expect(acceptFeedbackText('좋아요'.repeat(40), facts)).toBe(false)
    expect(acceptFeedbackText('잘했어요.\n등도 해요.', facts)).toBe(false)
    expect(acceptFeedbackText('잘했어요!', facts)).toBe(false)
  })
})

describe('feedbackPrompt', () => {
  it('lists the record and every fact', () => {
    const prompt = feedbackPrompt({
      userId: 'u1',
      track: TRACKS.exercise,
      answer: { kind: 'gym', parts: ['chest'], intensity: 'mid' },
      facts: ['이번 주 등은 없었어요.'],
    })
    expect(prompt).toContain('오늘 기록: 헬스, 가슴, 적당')
    expect(prompt).toContain('- 이번 주 등은 없었어요.')
  })
})
