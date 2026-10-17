import { parsePrediction, type QuestionRow } from './db.ts'
import { describeAnswer, describeEntries, isTrackId, TRACKS, type Answer, type TrackDef } from './tracks.ts'

/**
 * 서비스워커가 푸시를 받으면 여기서 "오늘 보여줄 알림"을 받아 간다.
 * 푸시에 본문을 싣지 않으므로(암호화 생략) 문구는 항상 서버 상태에서 다시 계산한다.
 * 같은 tag 는 알림을 교체하므로 여러 번 불려도 중복이 생기지 않는다.
 */

export type NotificationAction = {
  action: 'accept' | 'quick' | 'open'
  title: string
}

export type InboxNotification = {
  tag: string
  title: string
  body: string
  url: string
  questionId: string
  track: string | null
  /** accept 버튼이 저장할 답. */
  prediction: Answer | null
  /** quick 버튼이 저장할 답. 한 탭으로 끝나는 트랙에만 있다. */
  quick: Answer | null
  actions: NotificationAction[]
}

export const FALLBACK_NOTIFICATION: Omit<InboxNotification, 'questionId'> = {
  tag: 'miri-daily',
  title: '오늘 어땠어요?',
  body: '3초면 끝나요',
  url: '/?from=push',
  track: null,
  prediction: null,
  quick: null,
  actions: [{ action: 'open', title: '기록하기' }],
}

/**
 * 예측이 있을 때 본문. "그래요"를 누르면 무엇이 저장되는지 알려준다.
 * 묶음(종목)이 있으면 첫 줄과 나머지 개수만. 알림 한 줄에 다 들어가지 않는다.
 */
export function predictionBody(track: TrackDef, prediction: Answer): string {
  for (const step of track.steps) {
    if (step.kind !== 'entries') continue
    const lines = describeEntries(step, prediction[step.key] ?? [])
    if (lines.length === 0) continue
    return lines.length > 1 ? `${lines[0]} 외 ${lines.length - 1}개` : (lines[0] as string)
  }
  return describeAnswer(track, prediction)
}

function dailyNotification(question: QuestionRow): InboxNotification | null {
  if (!isTrackId(question.track)) return null
  const track = TRACKS[question.track]
  const prediction = parsePrediction(question.track, question.prediction)
  const quick = track.quick?.answer ?? null

  const actions: NotificationAction[] = prediction
    ? [
        { action: 'accept', title: '그래요' },
        { action: 'open', title: '다르게' },
      ]
    : [
        ...(track.quick ? [{ action: 'quick' as const, title: track.quick.title }] : []),
        { action: 'open', title: '기록하기' },
      ]

  return {
    tag: `miri-${question.track}`,
    title: question.text,
    body: [
      question.reminded ? '아직이에요.' : null,
      prediction ? predictionBody(track, prediction) : `${track.name}, 3초면 끝나요`,
    ]
      .filter(Boolean)
      .join(' '),
    url: `/?from=push&track=${question.track}`,
    questionId: question.id,
    track: question.track,
    prediction,
    quick: prediction ? null : quick,
    actions,
  }
}

function weeklyNotification(question: QuestionRow): InboxNotification {
  return {
    tag: 'miri-weekly',
    title: '이번 주 흐름',
    body: question.text,
    url: '/?from=push&view=flow',
    questionId: question.id,
    track: null,
    prediction: null,
    quick: null,
    actions: [{ action: 'open', title: '흐름 보기' }],
  }
}

/** 오늘 질문 중 아직 보여줄 것. daily 는 답이 없을 때만, weekly 는 당일 내내. */
export function buildInbox(questionsToday: QuestionRow[]): InboxNotification[] {
  return questionsToday.flatMap((question) => {
    if (question.intent === 'weekly') return [weeklyNotification(question)]
    if (question.answered_at) return []
    const notification = dailyNotification(question)
    return notification ? [notification] : []
  })
}
