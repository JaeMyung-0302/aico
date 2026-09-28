import { describe, expect, it } from 'vitest'
import { templateComposers, type Composers } from './dispatch.ts'
import { composeFeedback } from './feedback.ts'
import { TRACKS, type HistoryLog, type TrackDef } from './tracks.ts'

/** 기존 트랙에는 아직 피드백 규칙이 없어서 테스트 전용 규칙을 붙인다. */
const coached: TrackDef = {
  ...TRACKS.exercise,
  feedback: (answer, history) =>
    answer.kind === 'rest' ? [] : [`최근 4주에 ${history.length}번 기록했어요.`, '다음엔 하체 어때요?'],
}

const history: HistoryLog[] = [
  { loggedOn: '2026-09-20', answer: { kind: 'rest' } },
  { loggedOn: '2026-09-22', answer: { kind: 'cardio', intensity: 'low' } },
]

function composersWith(feedback: Composers['feedback']): Composers {
  return { ...templateComposers, feedback }
}

describe('composeFeedback', () => {
  it('returns null when the track has no rule or nothing to say', async () => {
    expect(await composeFeedback('u1', TRACKS.exercise, { kind: 'gym' }, history)).toBeNull()
    expect(await composeFeedback('u1', coached, { kind: 'rest' }, history)).toBeNull()
  })

  it('joins the rule facts when there is no AI', async () => {
    expect(await composeFeedback('u1', coached, { kind: 'cardio', intensity: 'mid' }, history)).toBe(
      '최근 4주에 2번 기록했어요. 다음엔 하체 어때요?',
    )
  })

  it('uses the AI wording when it succeeds and passes the facts through', async () => {
    let seen: string[] = []
    const compose = composersWith(async ({ facts }) => {
      seen = facts
      return '4주에 2번이에요. 다음엔 하체 어때요?'
    })
    expect(await composeFeedback('u1', coached, { kind: 'cardio', intensity: 'mid' }, history, compose)).toBe(
      '4주에 2번이에요. 다음엔 하체 어때요?',
    )
    expect(seen).toHaveLength(2)
  })

  it('falls back to the rule facts when the AI fails', async () => {
    const compose = composersWith(async () => {
      throw new Error('timeout')
    })
    expect(await composeFeedback('u1', coached, { kind: 'cardio', intensity: 'mid' }, history, compose)).toBe(
      '최근 4주에 2번 기록했어요. 다음엔 하체 어때요?',
    )
  })
})
