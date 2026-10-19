import { normalizeAnswer, type Answer, type HistoryLog, type TrackDef } from './tracks.ts'

export type { HistoryLog }

/**
 * 오늘 답을 미리 채워 두는 규칙. LLM 없이 "같은 요일에 가장 자주 한 루틴" 만 본다.
 * 근거가 2번 미만이면 예측하지 않는다. 틀린 예측은 없는 예측보다 나쁘다.
 */

export const PREDICTION_MIN_SUPPORT = 2

/** 정규화된 답은 키 순서와 배열 순서가 고정이라 JSON 문자열이 곧 조합 키다. */
function comboKey(answer: Answer): string {
  return JSON.stringify(answer)
}

/**
 * 같은 요일 기록(최신순)을 루틴 키로 묶어 가장 많은 묶음의 가장 최근 답을 돌려준다.
 * 동률이면 더 최근에 한 루틴. 무게처럼 매번 조금씩 다른 값은 키에서 빠지므로
 * "화요일은 가슴" 을 알아보고, 내용은 지난번 그대로 제안한다.
 */
export function predictFromHistory(
  sameWeekdayLogs: HistoryLog[],
  keyOf: (answer: Answer) => string = comboKey,
): Answer | null {
  if (sameWeekdayLogs.length < PREDICTION_MIN_SUPPORT) return null

  const groups = new Map<string, { latest: HistoryLog; count: number }>()
  for (const log of sameWeekdayLogs) {
    const key = keyOf(log.answer)
    const current = groups.get(key)
    groups.set(key, {
      latest: current && current.latest.loggedOn > log.loggedOn ? current.latest : log,
      count: (current?.count ?? 0) + 1,
    })
  }

  const best = [...groups.values()].sort(
    (a, b) => b.count - a.count || (b.latest.loggedOn > a.latest.loggedOn ? 1 : -1),
  )[0]
  if (!best || best.count < PREDICTION_MIN_SUPPORT) return null
  return best.latest.answer
}

/**
 * 트랙 기준 예측. 예측은 "그래요" 한 번으로 그대로 저장되므로 지금 트랙 정의로 저장 가능한 답만 낸다.
 * 트랙이 바뀌기 전 형식의 기록에서 나온 예측은 여기서 걸러진다.
 */
export function predictFor(track: TrackDef, sameWeekdayLogs: HistoryLog[]): Answer | null {
  const predicted = predictFromHistory(sameWeekdayLogs, track.routineKey)
  return predicted ? normalizeAnswer(track, predicted) : null
}
