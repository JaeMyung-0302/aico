import { parsePrediction, type QuestionRow } from './db.ts'
import { isTrackId, TRACKS, type Answer } from './tracks.ts'

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
    body: question.reminded ? `아직이에요. ${track.name}, 3초면 끝나요` : `${track.name}, 3초면 끝나요`,
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
