import {
  ALL_TRACKS,
  deleteUser,
  hasUnansweredStreak,
  insertQuestion,
  listTracks,
  logsBetween,
  markReminded,
  questionsAwaitingReminder,
  recordEvent,
  sameWeekdayLogs,
  tracksDueAt,
  usersDueWeekly,
  weekDaysLogged,
  type UserRow,
} from './db.ts'
import { kstDate, kstSlot, kstWeekday, shiftDate } from './kst.ts'
import { predictFromHistory } from './predict.ts'
import { sendPush } from './push.ts'
import {
  confirmQuestionText,
  describeAnswer,
  openQuestionText,
  summarizeTrackWeek,
  TRACK_IDS,
  TRACKS,
  type Answer,
} from './tracks.ts'

/**
 * 10분마다 도는 발송기. 세 가지 알림이 같은 경로를 탄다.
 *  daily   트랙마다 사용자가 고른 시각에 오늘 질문. 예측이 있으면 확인형으로.
 *  remind  90분 지나도 답이 없으면 한 번만 다시. 트랙 설정에서 끌 수 있다.
 *  weekly  일요일, 켜진 트랙 중 가장 이른 시각에 지난 7일 요약을 한 건으로.
 * 침묵 규칙: 한 트랙이 5번 연속 무응답이면 월요일과 목요일에만 묻는다.
 * 쉬는 요일은 tracksDueAt 이 거른다.
 */

export const CRON_STEP_MINUTES = 10
export const REMIND_AFTER_MINUTES = 90
export const SILENCE_AFTER_UNANSWERED = 5
const THROTTLED_WEEKDAYS = [1, 4]
const SUNDAY = 0
const DAY_MS = 24 * 60 * 60 * 1000

export type Vapid = { subject: string; publicKey: string; privateKey: string }
export type Tally = { sent: number; failed: number; skipped: number }
export type DispatchReport = { slot: string; daily: Tally; remind: Tally; weekly: Tally }

/** 문구 회전과 AI 문구가 같이 쓰는 입력. */
export type QuestionContext = {
  userId: string
  track: (typeof TRACKS)[keyof typeof TRACKS]
  prediction: Answer | null
  /** 최근 7일 답을 사람이 읽는 말로. "헬스, 가슴, 적당" */
  recent: string[]
  weekDays: number
  dayIndex: number
  salt: number
}

export type WeeklyContext = { userId: string; lines: string[] }

/** 문구를 만드는 함수 묶음. 기본은 템플릿이고, AI 가 붙으면 이 자리를 대신한다. 실패하면 템플릿. */
export type Composers = {
  daily: (ctx: QuestionContext) => Promise<string>
  weekly: (ctx: WeeklyContext) => Promise<string>
}

export const templateComposers: Composers = {
  daily: async ({ track, prediction, dayIndex, salt }) =>
    prediction ? confirmQuestionText(track, prediction, dayIndex, salt) : openQuestionText(track, dayIndex, salt),
  weekly: async ({ lines }) => lines.join('\n'),
}

type Ctx = {
  db: D1Database
  vapid: Vapid
  now: Date
  today: string
  slot: string
  compose: Composers
}

function tally(): Tally {
  return { sent: 0, failed: 0, skipped: 0 }
}

/** 날짜를 정수로. 문구 회전의 기준. */
export function dayIndexOf(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
}

/** 사용자마다 회전 시작점을 다르게. 같은 날 모두가 같은 문구를 받지 않게 한다. */
export function saltOf(userId: string): number {
  return parseInt(userId.slice(0, 2), 16) || 0
}

/** 푸시 1건. 구독이 죽었으면 사용자를 지운다(트랙, 질문, 기록은 cascade). */
async function pushTo(ctx: Ctx, user: UserRow): Promise<boolean> {
  const result = await sendPush(user, ctx.vapid)
  if (result.ok) return true
  if (result.gone) {
    await deleteUser(ctx.db, user.id)
  } else {
    await recordEvent(ctx.db, user.id, 'push_failed', ctx.today)
  }
  return false
}

async function sendDaily(ctx: Ctx): Promise<Tally> {
  const report = tally()
  const weekday = kstWeekday(ctx.now)
  const due = await tracksDueAt(ctx.db, ctx.slot, ctx.today, weekday)

  for (const { user, track } of due) {
    const throttled = await hasUnansweredStreak(ctx.db, user.id, track, SILENCE_AFTER_UNANSWERED)
    if (throttled && !THROTTLED_WEEKDAYS.includes(weekday)) {
      report.skipped += 1
      continue
    }

    const prediction = predictFromHistory(await sameWeekdayLogs(ctx.db, user.id, track, ctx.today))
    const recentLogs = await logsBetween(ctx.db, user.id, track, shiftDate(ctx.today, -7), shiftDate(ctx.today, -1))
    const context: QuestionContext = {
      userId: user.id,
      track: TRACKS[track],
      prediction,
      recent: recentLogs.map((log) => describeAnswer(TRACKS[track], log.answer)),
      weekDays: await weekDaysLogged(ctx.db, user.id, track, ctx.today),
      dayIndex: dayIndexOf(ctx.today),
      salt: saltOf(user.id),
    }
    // AI 가 실패해도 알림은 나가야 하므로 템플릿으로 떨어진다. 사유는 로그로만 남긴다.
    const text = await ctx.compose.daily(context).catch((cause: unknown) => {
      console.warn('ai daily fallback', track, String(cause))
      return templateComposers.daily(context)
    })

    await insertQuestion(ctx.db, {
      userId: user.id,
      track,
      intent: 'daily',
      text,
      prediction,
      askedOn: ctx.today,
      askedAt: ctx.now.toISOString(),
    })

    if (await pushTo(ctx, user)) {
      report.sent += 1
      await recordEvent(ctx.db, user.id, 'push_sent', ctx.today)
    } else {
      report.failed += 1
    }
  }
  return report
}

async function sendReminders(ctx: Ctx): Promise<Tally> {
  const report = tally()
  const askedBefore = new Date(ctx.now.getTime() - REMIND_AFTER_MINUTES * 60 * 1000).toISOString()
  const pending = await questionsAwaitingReminder(ctx.db, ctx.today, askedBefore)

  for (const question of pending) {
    // inbox 가 재알림 문구를 고르도록 푸시보다 먼저 표시한다.
    await markReminded(ctx.db, question.id)
    if (await pushTo(ctx, question.user)) {
      report.sent += 1
      await recordEvent(ctx.db, question.user_id, 'remind_sent', ctx.today)
    } else {
      report.failed += 1
    }
  }
  return report
}

/** 켜진 트랙마다 집계 한 줄씩. 카탈로그 순서. */
export async function weeklyLines(db: D1Database, userId: string, today: string): Promise<string[]> {
  const tracks = (await listTracks(db, userId))
    .filter((item) => item.enabled)
    .sort((a, b) => TRACK_IDS.indexOf(a.track) - TRACK_IDS.indexOf(b.track))
  const lines: string[] = []
  for (const settings of tracks) {
    const logs = await logsBetween(db, userId, settings.track, shiftDate(today, -6), today)
    lines.push(summarizeTrackWeek(TRACKS[settings.track], logs.map((log) => log.answer)))
  }
  return lines.length > 0 ? lines : ['이번 주는 기록이 없었어요. 오늘부터 다시 시작해요']
}

/** 주간 요약 본문. AI 가 있으면 다듬고, 실패하면 집계 줄을 그대로 쓴다. */
export async function weeklyText(
  db: D1Database,
  userId: string,
  today: string,
  compose: Composers = templateComposers,
): Promise<string> {
  const context: WeeklyContext = { userId, lines: await weeklyLines(db, userId, today) }
  return compose.weekly(context).catch((cause: unknown) => {
    console.warn('ai weekly fallback', String(cause))
    return templateComposers.weekly(context)
  })
}

async function sendWeekly(ctx: Ctx): Promise<Tally> {
  const report = tally()
  if (kstWeekday(ctx.now) !== SUNDAY) return report

  const users = await usersDueWeekly(ctx.db, ctx.slot, ctx.today)
  for (const user of users) {
    await insertQuestion(ctx.db, {
      userId: user.id,
      track: ALL_TRACKS,
      intent: 'weekly',
      text: await weeklyText(ctx.db, user.id, ctx.today, ctx.compose),
      prediction: null,
      askedOn: ctx.today,
      askedAt: ctx.now.toISOString(),
    })

    if (await pushTo(ctx, user)) {
      report.sent += 1
      await recordEvent(ctx.db, user.id, 'summary_sent', ctx.today)
    } else {
      report.failed += 1
    }
  }
  return report
}

/** cron 과 수동 테스트(/api/dispatch)가 같은 경로를 탄다. */
export async function dispatch(
  db: D1Database,
  vapid: Vapid,
  now: Date = new Date(),
  compose: Composers = templateComposers,
): Promise<DispatchReport> {
  const ctx: Ctx = {
    db,
    vapid,
    now,
    today: kstDate(now),
    slot: kstSlot(now, CRON_STEP_MINUTES),
    compose,
  }
  const daily = await sendDaily(ctx)
  const weekly = await sendWeekly(ctx)
  const remind = await sendReminders(ctx)
  return { slot: ctx.slot, daily, remind, weekly }
}
