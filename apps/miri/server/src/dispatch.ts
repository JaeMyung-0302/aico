import {
  deleteUser,
  hasUnansweredStreak,
  insertQuestion,
  logsBetween,
  markReminded,
  questionsAwaitingReminder,
  recordEvent,
  sameWeekdayLogs,
  usersDueAt,
  type UserRow,
} from './db.ts'
import { kstDate, kstSlot, kstWeekday, shiftDate } from './kst.ts'
import { dailyQuestionText, predictFromHistory } from './predict.ts'
import { sendPush } from './push.ts'
import { summarizeWeek } from './summary.ts'

/**
 * 10분마다 도는 발송기. 세 가지 알림이 같은 경로를 탄다.
 *  daily   사용자가 고른 슬롯에 오늘 질문. 예측이 있으면 확인형으로.
 *  remind  90분 지나도 답이 없으면 한 번만 다시.
 *  weekly  일요일 같은 슬롯에 지난 7일 요약.
 * 침묵 규칙: daily 5번 연속 무응답이면 월요일과 목요일에만 묻는다.
 */

export const CRON_STEP_MINUTES = 10
export const REMIND_AFTER_MINUTES = 90
export const SILENCE_AFTER_UNANSWERED = 5
const THROTTLED_WEEKDAYS = [1, 4]
const SUNDAY = 0

export type Vapid = { subject: string; publicKey: string; privateKey: string }
export type Tally = { sent: number; failed: number; skipped: number }
export type DispatchReport = { slot: string; daily: Tally; remind: Tally; weekly: Tally }

type Ctx = { db: D1Database; vapid: Vapid; now: Date; today: string; slot: string }

function tally(): Tally {
  return { sent: 0, failed: 0, skipped: 0 }
}

/** 푸시 1건. 구독이 죽었으면 사용자를 지운다(질문과 기록은 cascade). */
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
  const users = await usersDueAt(ctx.db, ctx.slot, ctx.today, 'daily')
  const weekday = kstWeekday(ctx.now)

  for (const user of users) {
    const throttled = await hasUnansweredStreak(ctx.db, user.id, SILENCE_AFTER_UNANSWERED)
    if (throttled && !THROTTLED_WEEKDAYS.includes(weekday)) {
      report.skipped += 1
      continue
    }

    const prediction = predictFromHistory(await sameWeekdayLogs(ctx.db, user.id, ctx.today))
    await insertQuestion(ctx.db, {
      userId: user.id,
      intent: 'daily',
      text: dailyQuestionText(prediction),
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

async function sendWeekly(ctx: Ctx): Promise<Tally> {
  const report = tally()
  if (kstWeekday(ctx.now) !== SUNDAY) return report

  const users = await usersDueAt(ctx.db, ctx.slot, ctx.today, 'weekly')
  for (const user of users) {
    const logs = await logsBetween(ctx.db, user.id, shiftDate(ctx.today, -6), ctx.today)
    await insertQuestion(ctx.db, {
      userId: user.id,
      intent: 'weekly',
      text: summarizeWeek(logs).text,
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
): Promise<DispatchReport> {
  const ctx: Ctx = {
    db,
    vapid,
    now,
    today: kstDate(now),
    slot: kstSlot(now, CRON_STEP_MINUTES),
  }
  const daily = await sendDaily(ctx)
  const weekly = await sendWeekly(ctx)
  const remind = await sendReminders(ctx)
  return { slot: ctx.slot, daily, remind, weekly }
}
