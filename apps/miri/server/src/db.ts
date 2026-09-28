import { isNotifyTime, offDaysToText, textToOffDays, type TrackSettings } from './domain.ts'
import { shiftDate, weekdayOf } from './kst.ts'
import type { HistoryLog } from './predict.ts'
import type { PushSubscription } from './push.ts'
import { isTrackId, normalizeAnswer, TRACKS, type Answer, type TrackId } from './tracks.ts'

/** D1 접근을 한 곳에 모은다. 라우트와 dispatch 는 SQL 을 직접 쓰지 않는다. */

export type UserRow = PushSubscription & { id: string; paused: number }

export type TrackRow = {
  user_id: string
  track: string
  notify_at: string
  enabled: number
  remind: number
  off_days: string
}

/** feedback 은 오늘 기록 한 건을 읽을 때만 고른다. */
export type LogRow = { track: string; logged_on: string; answer: string; feedback?: string | null }

/** 오늘 기록 한 건. 피드백은 할 말이 없던 날 null. */
export type TodayLog = { answer: Answer; feedback: string | null }

export type QuestionIntent = 'daily' | 'weekly'
export type AnsweredVia = 'predict' | 'pick' | 'action'

export type QuestionRow = {
  id: string
  user_id: string
  track: string
  intent: QuestionIntent
  text: string
  prediction: string | null
  asked_on: string
  asked_at: string
  reminded: number
  answered_at: string | null
}

export type EventType =
  | 'push_sent'
  | 'push_failed'
  | 'opened'
  | 'completed'
  | 'remind_sent'
  | 'summary_sent'

/** 주간 요약은 트랙을 묶어 한 건이라 이 값을 track 열에 둔다. */
export const ALL_TRACKS = 'all'
const SAME_WEEKDAY_WEEKS = 8

function parseAnswer(track: TrackId, raw: string | null): Answer | null {
  if (!raw) return null
  try {
    return normalizeAnswer(TRACKS[track], JSON.parse(raw), 'lenient')
  } catch {
    return null
  }
}

export function toSettings(row: TrackRow): TrackSettings | null {
  if (!isTrackId(row.track)) return null
  return {
    track: row.track,
    enabled: row.enabled === 1,
    notifyAt: row.notify_at,
    remind: row.remind === 1,
    offDays: textToOffDays(row.off_days),
  }
}

export function parsePrediction(track: string, raw: string | null): Answer | null {
  return isTrackId(track) ? parseAnswer(track, raw) : null
}

// ── users ──────────────────────────────────────────────────────

export function findUser(db: D1Database, userId: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
}

export function findUserByEndpoint(db: D1Database, endpoint: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE endpoint = ?').bind(endpoint).first<UserRow>()
}

export async function insertUser(db: D1Database, subscription: PushSubscription): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO users (id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)')
    .bind(id, subscription.endpoint, subscription.p256dh, subscription.auth)
    .run()
  return id
}

export async function setPaused(db: D1Database, userId: string, paused: boolean): Promise<void> {
  await db.prepare('UPDATE users SET paused = ? WHERE id = ?').bind(paused ? 1 : 0, userId).run()
}

export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
}

// ── user_tracks ────────────────────────────────────────────────

export async function listTracks(db: D1Database, userId: string): Promise<TrackSettings[]> {
  const { results } = await db
    .prepare('SELECT * FROM user_tracks WHERE user_id = ?')
    .bind(userId)
    .all<TrackRow>()
  return results.flatMap((row) => {
    const settings = toSettings(row)
    return settings ? [settings] : []
  })
}

/** 없으면 기본값으로 만들고 patch 만 덮어쓴다. */
export async function upsertTrack(
  db: D1Database,
  userId: string,
  track: TrackId,
  patch: Partial<Omit<TrackSettings, 'track'>>,
): Promise<void> {
  const existing = await db
    .prepare('SELECT * FROM user_tracks WHERE user_id = ? AND track = ?')
    .bind(userId, track)
    .first<TrackRow>()

  const current = (existing && toSettings(existing)) ?? {
    track,
    enabled: true,
    notifyAt: TRACKS[track].defaultNotifyAt,
    remind: true,
    offDays: [],
  }
  const next = { ...current, ...patch }
  if (!isNotifyTime(next.notifyAt)) next.notifyAt = TRACKS[track].defaultNotifyAt

  await db
    .prepare(
      `INSERT INTO user_tracks (user_id, track, notify_at, enabled, remind, off_days)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, track)
       DO UPDATE SET notify_at = excluded.notify_at, enabled = excluded.enabled,
                     remind = excluded.remind, off_days = excluded.off_days`,
    )
    .bind(
      userId,
      track,
      next.notifyAt,
      next.enabled ? 1 : 0,
      next.remind ? 1 : 0,
      offDaysToText(next.offDays),
    )
    .run()
}

export type DueTrack = { user: UserRow; track: TrackId; settings: TrackSettings }

/**
 * 이 슬롯에 알림을 받는 (사용자, 트랙). 켜져 있고, 사용자가 멈추지 않았고,
 * 오늘 그 트랙 질문을 아직 안 받았고, 오늘 그 트랙 기록도 없는 것만.
 * 쉬는 요일은 문자열이라 JS 에서 거른다.
 */
export async function tracksDueAt(
  db: D1Database,
  slot: string,
  today: string,
  weekday: number,
): Promise<DueTrack[]> {
  const { results } = await db
    .prepare(
      `SELECT t.*, u.endpoint, u.p256dh, u.auth, u.paused
       FROM user_tracks t JOIN users u ON u.id = t.user_id
       WHERE t.notify_at = ?1 AND t.enabled = 1 AND u.paused = 0
         AND NOT EXISTS (
           SELECT 1 FROM questions q
           WHERE q.user_id = t.user_id AND q.track = t.track AND q.asked_on = ?2 AND q.intent = 'daily')
         AND NOT EXISTS (
           SELECT 1 FROM logs l
           WHERE l.user_id = t.user_id AND l.track = t.track AND l.logged_on = ?2)`,
    )
    .bind(slot, today)
    .all<TrackRow & PushSubscription & { paused: number }>()

  return results.flatMap((row) => {
    const settings = toSettings(row)
    if (!settings || settings.offDays.includes(weekday)) return []
    return [
      {
        user: { id: row.user_id, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth, paused: row.paused },
        track: settings.track,
        settings,
      },
    ]
  })
}

/** 주간 요약 대상. 켜진 트랙 중 가장 이른 시각이 이 슬롯인 사용자, 오늘 요약을 아직 안 받은 사람. */
export async function usersDueWeekly(db: D1Database, slot: string, today: string): Promise<UserRow[]> {
  const { results } = await db
    .prepare(
      `SELECT u.* FROM users u
       WHERE u.paused = 0
         AND (SELECT MIN(t.notify_at) FROM user_tracks t WHERE t.user_id = u.id AND t.enabled = 1) = ?1
         AND NOT EXISTS (
           SELECT 1 FROM questions q
           WHERE q.user_id = u.id AND q.asked_on = ?2 AND q.intent = 'weekly')`,
    )
    .bind(slot, today)
    .all<UserRow>()
  return results
}

// ── logs ───────────────────────────────────────────────────────

/**
 * 같은 날 다시 누르면 덮어쓴다. 오답을 고치려고 앱을 다시 여는 마찰을 없애기 위해서다.
 * 답이 바뀌면 피드백도 그 답 기준으로 다시 쓴다.
 */
export async function upsertLog(
  db: D1Database,
  userId: string,
  track: TrackId,
  loggedOn: string,
  answer: Answer,
  feedback: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO logs (user_id, track, logged_on, answer, feedback) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, track, logged_on)
       DO UPDATE SET answer = excluded.answer, feedback = excluded.feedback`,
    )
    .bind(userId, track, loggedOn, JSON.stringify(answer), feedback)
    .run()
}

export async function findLog(
  db: D1Database,
  userId: string,
  track: TrackId,
  loggedOn: string,
): Promise<TodayLog | null> {
  const row = await db
    .prepare('SELECT track, logged_on, answer, feedback FROM logs WHERE user_id = ? AND track = ? AND logged_on = ?')
    .bind(userId, track, loggedOn)
    .first<LogRow>()
  const answer = row ? parseAnswer(track, row.answer) : null
  return row && answer ? { answer, feedback: row.feedback ?? null } : null
}

/** from 이상 to 이하, 날짜 오름차순. */
export async function logsBetween(
  db: D1Database,
  userId: string,
  track: TrackId,
  from: string,
  to: string,
): Promise<HistoryLog[]> {
  const { results } = await db
    .prepare(
      `SELECT track, logged_on, answer FROM logs
       WHERE user_id = ? AND track = ? AND logged_on BETWEEN ? AND ? ORDER BY logged_on`,
    )
    .bind(userId, track, from, to)
    .all<LogRow>()

  return results.flatMap((row) => {
    const answer = parseAnswer(track, row.answer)
    return answer ? [{ loggedOn: row.logged_on, answer }] : []
  })
}

/** 예측 근거. 지난 8주 중 오늘과 같은 요일의 기록, 최신순. */
export async function sameWeekdayLogs(
  db: D1Database,
  userId: string,
  track: TrackId,
  today: string,
): Promise<HistoryLog[]> {
  const weekday = weekdayOf(today)
  const logs = await logsBetween(db, userId, track, shiftDate(today, -7 * SAME_WEEKDAY_WEEKS), shiftDate(today, -1))
  return logs.filter((log) => weekdayOf(log.loggedOn) === weekday).reverse()
}

/** 오늘 포함 최근 7일 중 기록한 날 수. 완료 화면의 "이번 주 n일째". */
export async function weekDaysLogged(
  db: D1Database,
  userId: string,
  track: TrackId,
  today: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS days FROM logs
       WHERE user_id = ? AND track = ? AND logged_on BETWEEN ? AND ?`,
    )
    .bind(userId, track, shiftDate(today, -6), today)
    .first<{ days: number }>()
  return row?.days ?? 0
}

// ── questions ──────────────────────────────────────────────────

export async function insertQuestion(
  db: D1Database,
  question: {
    userId: string
    track: string
    intent: QuestionIntent
    text: string
    prediction: Answer | null
    askedOn: string
    askedAt: string
  },
): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO questions (id, user_id, track, intent, text, prediction, asked_on, asked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      question.userId,
      question.track,
      question.intent,
      question.text,
      question.prediction ? JSON.stringify(question.prediction) : null,
      question.askedOn,
      question.askedAt,
    )
    .run()
  return id
}

export async function questionsOn(db: D1Database, userId: string, askedOn: string): Promise<QuestionRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM questions WHERE user_id = ? AND asked_on = ? ORDER BY asked_at')
    .bind(userId, askedOn)
    .all<QuestionRow>()
  return results
}

/** 오늘 daily 질문 중 답이 없고, 재알림이 켜진 트랙이며, 던진 지 cutoff 이전인 것. */
export async function questionsAwaitingReminder(
  db: D1Database,
  today: string,
  askedBefore: string,
): Promise<(QuestionRow & { user: UserRow })[]> {
  const { results } = await db
    .prepare(
      `SELECT q.*, u.endpoint, u.p256dh, u.auth, u.paused
       FROM questions q
       JOIN users u ON u.id = q.user_id
       JOIN user_tracks t ON t.user_id = q.user_id AND t.track = q.track
       WHERE q.intent = 'daily' AND q.asked_on = ? AND q.answered_at IS NULL
         AND q.reminded = 0 AND q.asked_at <= ? AND u.paused = 0 AND t.remind = 1 AND t.enabled = 1`,
    )
    .bind(today, askedBefore)
    .all<QuestionRow & PushSubscription & { paused: number }>()

  return results.map((row) => ({
    ...row,
    user: { id: row.user_id, endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth, paused: row.paused },
  }))
}

export async function markReminded(db: D1Database, questionId: string): Promise<void> {
  await db.prepare('UPDATE questions SET reminded = 1 WHERE id = ?').bind(questionId).run()
}

/** 오늘 그 트랙의 daily 질문에 답을 단다. 질문이 없던 날(알림 전에 먼저 기록)은 그냥 넘어간다. */
export async function answerDailyQuestion(
  db: D1Database,
  userId: string,
  track: TrackId,
  askedOn: string,
  via: AnsweredVia,
): Promise<void> {
  await db
    .prepare(
      `UPDATE questions SET answered_at = ?, answered_via = ?
       WHERE user_id = ? AND track = ? AND asked_on = ? AND intent = 'daily'`,
    )
    .bind(new Date().toISOString(), via, userId, track, askedOn)
    .run()
}

/** 침묵 규칙 근거. 그 트랙의 최근 daily 질문 n 개가 전부 무응답이면 true. */
export async function hasUnansweredStreak(
  db: D1Database,
  userId: string,
  track: TrackId,
  length: number,
): Promise<boolean> {
  const { results } = await db
    .prepare(
      `SELECT answered_at FROM questions
       WHERE user_id = ? AND track = ? AND intent = 'daily' ORDER BY asked_on DESC LIMIT ?`,
    )
    .bind(userId, track, length)
    .all<{ answered_at: string | null }>()
  return results.length >= length && results.every((row) => row.answered_at === null)
}

// ── events ─────────────────────────────────────────────────────

export async function recordEvent(
  db: D1Database,
  userId: string,
  type: EventType,
  occurredOn: string,
): Promise<void> {
  await db
    .prepare('INSERT INTO events (user_id, type, occurred_on) VALUES (?, ?, ?)')
    .bind(userId, type, occurredOn)
    .run()
}

export async function funnel(
  db: D1Database,
  userId: string,
): Promise<{ sent: number; opened: number; completed: number }> {
  const row = await db
    .prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN type = 'push_sent' THEN occurred_on END) AS sent,
         COUNT(DISTINCT CASE WHEN type = 'opened'    THEN occurred_on END) AS opened,
         COUNT(DISTINCT CASE WHEN type = 'completed' THEN occurred_on END) AS completed
       FROM events WHERE user_id = ?`,
    )
    .bind(userId)
    .first<{ sent: number; opened: number; completed: number }>()
  return row ?? { sent: 0, opened: 0, completed: 0 }
}
