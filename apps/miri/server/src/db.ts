import { isIntensity, isKind, isPart, type Entry, type NotifySlot } from './domain.ts'
import { shiftDate, weekdayOf } from './kst.ts'
import type { HistoryLog } from './predict.ts'
import type { PushSubscription } from './push.ts'

/** D1 접근을 한 곳에 모은다. 라우트와 dispatch 는 SQL 을 직접 쓰지 않는다. */

export type UserRow = PushSubscription & {
  id: string
  notify_at: string
  paused: number
}

export type LogRow = {
  logged_on: string
  kind: string
  parts: string | null
  intensity: string | null
}

export type QuestionIntent = 'daily' | 'weekly'
export type AnsweredVia = 'predict' | 'pick' | 'action'

export type QuestionRow = {
  id: string
  user_id: string
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

const SAME_WEEKDAY_WEEKS = 8

/** 저장된 행을 Entry 로. 저장 시 검증했지만 읽을 때도 옵션 밖 값은 버린다. */
export function toEntry(row: LogRow): Entry | null {
  if (!isKind(row.kind)) return null
  const parsed: unknown = row.parts ? JSON.parse(row.parts) : []
  const parts = Array.isArray(parsed) ? parsed.filter(isPart) : []
  return { kind: row.kind, parts, intensity: isIntensity(row.intensity) ? row.intensity : null }
}

export function parsePrediction(raw: string | null): Entry | null {
  if (!raw) return null
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as { kind?: unknown; parts?: unknown; intensity?: unknown }
  if (!isKind(candidate.kind)) return null
  const parts = Array.isArray(candidate.parts) ? candidate.parts.filter(isPart) : []
  return {
    kind: candidate.kind,
    parts,
    intensity: isIntensity(candidate.intensity) ? candidate.intensity : null,
  }
}

// ── users ──────────────────────────────────────────────────────

export function findUser(db: D1Database, userId: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
}

export function findUserByEndpoint(db: D1Database, endpoint: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE endpoint = ?').bind(endpoint).first<UserRow>()
}

export async function insertUser(
  db: D1Database,
  subscription: PushSubscription,
  notifyAt: NotifySlot,
): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO users (id, endpoint, p256dh, auth, notify_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, subscription.endpoint, subscription.p256dh, subscription.auth, notifyAt)
    .run()
  return id
}

export async function updateUser(
  db: D1Database,
  userId: string,
  patch: { notifyAt?: NotifySlot; paused?: boolean },
): Promise<void> {
  if (patch.notifyAt !== undefined) {
    await db.prepare('UPDATE users SET notify_at = ? WHERE id = ?').bind(patch.notifyAt, userId).run()
  }
  if (patch.paused !== undefined) {
    await db
      .prepare('UPDATE users SET paused = ? WHERE id = ?')
      .bind(patch.paused ? 1 : 0, userId)
      .run()
  }
}

export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
}

/**
 * 이 슬롯에 알림을 받고, 멈추지 않았고, 오늘 해당 질문을 아직 안 받은 사용자.
 * daily 는 알림 전에 먼저 기록한 사람도 뺀다. 이미 답한 걸 또 묻지 않는다.
 */
export async function usersDueAt(
  db: D1Database,
  slot: string,
  today: string,
  intent: QuestionIntent,
): Promise<UserRow[]> {
  const skipLogged =
    intent === 'daily'
      ? 'AND NOT EXISTS (SELECT 1 FROM logs l WHERE l.user_id = u.id AND l.logged_on = ?2)'
      : ''
  const { results } = await db
    .prepare(
      `SELECT u.* FROM users u
       WHERE u.notify_at = ?1 AND u.paused = 0
         AND NOT EXISTS (
           SELECT 1 FROM questions q
           WHERE q.user_id = u.id AND q.asked_on = ?2 AND q.intent = ?3)
         ${skipLogged}`,
    )
    .bind(slot, today, intent)
    .all<UserRow>()
  return results
}

// ── logs ───────────────────────────────────────────────────────

/** 같은 날 다시 누르면 덮어쓴다. 오답을 고치려고 앱을 다시 여는 마찰을 없애기 위해서다. */
export async function upsertLog(
  db: D1Database,
  userId: string,
  loggedOn: string,
  entry: Entry,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO logs (user_id, logged_on, kind, parts, intensity)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, logged_on)
       DO UPDATE SET kind = excluded.kind, parts = excluded.parts, intensity = excluded.intensity`,
    )
    .bind(
      userId,
      loggedOn,
      entry.kind,
      entry.parts.length > 0 ? JSON.stringify(entry.parts) : null,
      entry.intensity,
    )
    .run()
}

export async function findLog(
  db: D1Database,
  userId: string,
  loggedOn: string,
): Promise<Entry | null> {
  const row = await db
    .prepare('SELECT logged_on, kind, parts, intensity FROM logs WHERE user_id = ? AND logged_on = ?')
    .bind(userId, loggedOn)
    .first<LogRow>()
  return row ? toEntry(row) : null
}

/** from 이상 to 이하, 날짜 오름차순. */
export async function logsBetween(
  db: D1Database,
  userId: string,
  from: string,
  to: string,
): Promise<HistoryLog[]> {
  const { results } = await db
    .prepare(
      `SELECT logged_on, kind, parts, intensity FROM logs
       WHERE user_id = ? AND logged_on BETWEEN ? AND ? ORDER BY logged_on`,
    )
    .bind(userId, from, to)
    .all<LogRow>()

  return results.flatMap((row) => {
    const entry = toEntry(row)
    return entry ? [{ ...entry, loggedOn: row.logged_on }] : []
  })
}

/** 예측 근거. 지난 8주 중 오늘과 같은 요일의 기록, 최신순. */
export async function sameWeekdayLogs(
  db: D1Database,
  userId: string,
  today: string,
): Promise<HistoryLog[]> {
  const weekday = weekdayOf(today)
  const logs = await logsBetween(db, userId, shiftDate(today, -7 * SAME_WEEKDAY_WEEKS), shiftDate(today, -1))
  return logs.filter((log) => weekdayOf(log.loggedOn) === weekday).reverse()
}

// ── questions ──────────────────────────────────────────────────

export async function insertQuestion(
  db: D1Database,
  question: {
    userId: string
    intent: QuestionIntent
    text: string
    prediction: Entry | null
    askedOn: string
    askedAt: string
  },
): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO questions (id, user_id, intent, text, prediction, asked_on, asked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      question.userId,
      question.intent,
      question.text,
      question.prediction ? JSON.stringify(question.prediction) : null,
      question.askedOn,
      question.askedAt,
    )
    .run()
  return id
}

export async function questionsOn(
  db: D1Database,
  userId: string,
  askedOn: string,
): Promise<QuestionRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM questions WHERE user_id = ? AND asked_on = ? ORDER BY asked_at')
    .bind(userId, askedOn)
    .all<QuestionRow>()
  return results
}

/** 오늘 daily 질문 중 답이 없고, 재알림 전이며, 던진 지 cutoff 이전인 것. 사용자 정보를 같이 든다. */
export async function questionsAwaitingReminder(
  db: D1Database,
  today: string,
  askedBefore: string,
): Promise<(QuestionRow & { user: UserRow })[]> {
  const { results } = await db
    .prepare(
      `SELECT q.*, u.endpoint, u.p256dh, u.auth, u.notify_at, u.paused
       FROM questions q JOIN users u ON u.id = q.user_id
       WHERE q.intent = 'daily' AND q.asked_on = ? AND q.answered_at IS NULL
         AND q.reminded = 0 AND q.asked_at <= ? AND u.paused = 0`,
    )
    .bind(today, askedBefore)
    .all<QuestionRow & PushSubscription & { notify_at: string; paused: number }>()

  return results.map((row) => ({
    ...row,
    user: {
      id: row.user_id,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
      notify_at: row.notify_at,
      paused: row.paused,
    },
  }))
}

export async function markReminded(db: D1Database, questionId: string): Promise<void> {
  await db.prepare('UPDATE questions SET reminded = 1 WHERE id = ?').bind(questionId).run()
}

/** 오늘의 daily 질문에 답을 단다. 질문이 없던 날(알림 전에 먼저 기록)은 그냥 넘어간다. */
export async function answerDailyQuestion(
  db: D1Database,
  userId: string,
  askedOn: string,
  via: AnsweredVia,
): Promise<void> {
  await db
    .prepare(
      `UPDATE questions SET answered_at = ?, answered_via = ?
       WHERE user_id = ? AND asked_on = ? AND intent = 'daily'`,
    )
    .bind(new Date().toISOString(), via, userId, askedOn)
    .run()
}

/** 침묵 규칙 근거. 최근 daily 질문 n 개가 전부 무응답이면 true. */
export async function hasUnansweredStreak(
  db: D1Database,
  userId: string,
  length: number,
): Promise<boolean> {
  const { results } = await db
    .prepare(
      `SELECT answered_at FROM questions
       WHERE user_id = ? AND intent = 'daily' ORDER BY asked_on DESC LIMIT ?`,
    )
    .bind(userId, length)
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
