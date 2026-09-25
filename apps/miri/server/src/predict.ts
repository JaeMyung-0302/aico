import { describeEntry, type Entry } from './domain.ts'

/**
 * 오늘 값을 미리 채워 두는 규칙. LLM 없이 "같은 요일에 가장 자주 한 조합" 만 본다.
 * 근거가 2번 미만이면 예측하지 않는다. 틀린 예측은 없는 예측보다 나쁘다.
 */

export const PREDICTION_MIN_SUPPORT = 2

export type HistoryLog = Entry & { loggedOn: string }

function comboKey(entry: Entry): string {
  return [entry.kind, entry.parts.join('+'), entry.intensity ?? ''].join('|')
}

/** 같은 요일 기록(최신순)을 받아 최빈 조합을 돌려준다. 동률이면 더 최근 것. */
export function predictFromHistory(sameWeekdayLogs: HistoryLog[]): Entry | null {
  if (sameWeekdayLogs.length < PREDICTION_MIN_SUPPORT) return null

  const counts = new Map<string, { entry: Entry; count: number; latest: string }>()
  for (const log of sameWeekdayLogs) {
    const key = comboKey(log)
    const current = counts.get(key)
    counts.set(key, {
      entry: { kind: log.kind, parts: log.parts, intensity: log.intensity },
      count: (current?.count ?? 0) + 1,
      latest: current && current.latest > log.loggedOn ? current.latest : log.loggedOn,
    })
  }

  const best = [...counts.values()].sort(
    (a, b) => b.count - a.count || (b.latest > a.latest ? 1 : -1),
  )[0]
  if (!best || best.count < PREDICTION_MIN_SUPPORT) return null
  return best.entry
}

/** 예측이 있으면 확인형, 없으면 열린 질문. */
export function dailyQuestionText(prediction: Entry | null): string {
  if (!prediction) return '오늘 몸 어떻게 썼어요?'
  return `오늘도 ${describeEntry(prediction)}?`
}
