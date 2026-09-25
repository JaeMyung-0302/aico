import { parsePrediction, type QuestionRow } from './db.ts'
import type { Entry } from './domain.ts'

/**
 * 서비스워커가 푸시를 받으면 여기서 "오늘 보여줄 알림"을 받아 간다.
 * 푸시에 본문을 싣지 않으므로(암호화 생략) 문구는 항상 서버 상태에서 다시 계산한다.
 * 같은 tag 는 알림을 교체하므로 여러 번 불려도 중복이 생기지 않는다.
 */

export type NotificationAction = {
  action: 'accept' | 'rest' | 'open'
  title: string
}

export type InboxNotification = {
  tag: 'miri-daily' | 'miri-weekly'
  title: string
  body: string
  url: string
  questionId: string
  prediction: Entry | null
  actions: NotificationAction[]
}

export const FALLBACK_NOTIFICATION: Omit<InboxNotification, 'questionId'> = {
  tag: 'miri-daily',
  title: '오늘 몸 어떻게 썼어요?',
  body: '3초면 끝나요',
  url: '/?from=push',
  prediction: null,
  actions: [
    { action: 'rest', title: '쉼' },
    { action: 'open', title: '기록하기' },
  ],
}

function dailyNotification(question: QuestionRow): InboxNotification {
  const prediction = parsePrediction(question.prediction)
  return {
    tag: 'miri-daily',
    title: question.text,
    body: question.reminded ? '아직이에요. 3초면 끝나요' : '3초면 끝나요',
    url: '/?from=push',
    questionId: question.id,
    prediction,
    actions: prediction
      ? [
          { action: 'accept', title: '그래요' },
          { action: 'open', title: '다르게' },
        ]
      : FALLBACK_NOTIFICATION.actions,
  }
}

function weeklyNotification(question: QuestionRow): InboxNotification {
  return {
    tag: 'miri-weekly',
    title: '이번 주 흐름',
    body: question.text,
    url: '/?from=push&view=flow',
    questionId: question.id,
    prediction: null,
    actions: [{ action: 'open', title: '흐름 보기' }],
  }
}

/** 오늘 질문 중 아직 보여줄 것. daily 는 답이 없을 때만, weekly 는 당일 내내. */
export function buildInbox(questionsToday: QuestionRow[]): InboxNotification[] {
  return questionsToday.flatMap((question) => {
    if (question.intent === 'weekly') return [weeklyNotification(question)]
    if (question.answered_at) return []
    return [dailyNotification(question)]
  })
}
