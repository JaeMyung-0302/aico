import { templateComposers, type Composers, type FeedbackContext } from './dispatch.ts'
import type { Answer, HistoryLog, TrackDef } from './tracks.ts'

/**
 * 기록 직후 돌려주는 한마디. 무엇을 말할지는 트랙 규칙(feedback)이 정하고,
 * AI 는 그 사실들을 문장으로 다듬기만 한다. AI 가 실패하면 규칙 문장을 그대로 쓴다.
 * 규칙이 없거나 할 말이 없으면 null 이라 화면과 알림은 예전처럼 끝난다.
 */

/** 피드백 판단에 쓰는 기록 기간. 오늘은 빼고 그 앞 4주. */
export const FEEDBACK_HISTORY_DAYS = 28

export async function composeFeedback(
  userId: string,
  track: TrackDef,
  answer: Answer,
  history: HistoryLog[],
  compose: Composers = templateComposers,
): Promise<string | null> {
  const facts = track.feedback?.(answer, history) ?? []
  if (facts.length === 0) return null

  const context: FeedbackContext = { userId, track, answer, facts }
  return compose.feedback(context).catch((cause: unknown) => {
    console.warn('ai feedback fallback', track.id, String(cause))
    return templateComposers.feedback(context)
  })
}
