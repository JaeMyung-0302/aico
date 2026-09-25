import {
  answerDailyQuestion,
  deleteUser,
  findLog,
  findUser,
  findUserByEndpoint,
  funnel,
  insertUser,
  logsBetween,
  parsePrediction,
  questionsOn,
  recordEvent,
  sameWeekdayLogs,
  updateUser,
  upsertLog,
  type AnsweredVia,
  type UserRow,
} from './db.ts'
import { isDispatchAuthorized } from './auth.ts'
import { dispatch } from './dispatch.ts'
import { isNotifySlot, normalizeEntry, NOTIFY_SLOTS } from './domain.ts'
import { buildInbox } from './inbox.ts'
import { kstDate, shiftDate } from './kst.ts'
import { predictFromHistory } from './predict.ts'
import { summarizeWeek } from './summary.ts'

export type Env = {
  DB: D1Database
  ASSETS: Fetcher
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  /** 수동 발송 허용 키. 비어 있으면 /api/dispatch 는 존재하지 않는다. */
  DISPATCH_KEY?: string
}

const DEFAULT_NOTIFY_AT = '21:00'
const HISTORY_DAYS_DEFAULT = 35
const HISTORY_DAYS_MAX = 120
const ANSWERED_VIA: AnsweredVia[] = ['predict', 'pick', 'action']

type Identity = { userId?: unknown; endpoint?: unknown }
type SubscribeBody = { endpoint?: string; p256dh?: string; auth?: string; notifyAt?: unknown }
type LogBody = Identity & { kind?: unknown; parts?: unknown; intensity?: unknown; via?: unknown }
type EventBody = Identity & { type?: unknown }
type MeBody = Identity & { notifyAt?: unknown; paused?: unknown }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function vapidFrom(env: Env) {
  return {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  }
}

async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

/**
 * 클라이언트는 userId 로, 서비스워커는 구독 endpoint 로 자신을 밝힌다.
 * dispatch 가 만료 구독을 지우므로 둘 다 "없음"이 정상적으로 생긴다. 그때는 재구독을 안내한다.
 */
async function resolveUser(env: Env, identity: Identity): Promise<UserRow | null> {
  if (typeof identity.userId === 'string') return findUser(env.DB, identity.userId)
  if (typeof identity.endpoint === 'string') return findUserByEndpoint(env.DB, identity.endpoint)
  return null
}

function identityFrom(url: URL): Identity {
  return {
    userId: url.searchParams.get('userId') ?? undefined,
    endpoint: url.searchParams.get('endpoint') ?? undefined,
  }
}

// Response 본문은 한 번만 읽히므로 매번 새로 만든다.
function unknownUser(): Response {
  return json({ error: 'unknown_user' }, 404)
}

function settingsOf(user: UserRow) {
  return { userId: user.id, notifyAt: user.notify_at, paused: user.paused === 1 }
}

// ── routes ─────────────────────────────────────────────────────

async function subscribe(request: Request, env: Env): Promise<Response> {
  const body = await readBody<SubscribeBody>(request)
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return json({ error: 'endpoint, p256dh, auth are required' }, 400)
  }
  const notifyAt = isNotifySlot(body.notifyAt) ? body.notifyAt : DEFAULT_NOTIFY_AT

  // 같은 브라우저가 재구독하면 endpoint 가 같으므로 기존 행을 그대로 쓰고 시간대만 갱신한다.
  const existing = await findUserByEndpoint(env.DB, body.endpoint)
  if (existing) {
    await updateUser(env.DB, existing.id, { notifyAt })
    return json(settingsOf({ ...existing, notify_at: notifyAt }))
  }

  const subscription = { endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth }
  const id = await insertUser(env.DB, subscription, notifyAt)
  return json({ userId: id, notifyAt, paused: false }, 201)
}

async function writeLog(request: Request, env: Env): Promise<Response> {
  const body = await readBody<LogBody>(request)
  const entry = body ? normalizeEntry({ kind: body.kind, parts: body.parts, intensity: body.intensity }) : null
  if (!body || !entry) return json({ error: 'kind (gym|cardio|light|rest) is required' }, 400)

  const user = await resolveUser(env, body)
  if (!user) return unknownUser()

  const via = ANSWERED_VIA.find((value) => value === body.via) ?? 'pick'
  const today = kstDate()
  await upsertLog(env.DB, user.id, today, entry)
  await answerDailyQuestion(env.DB, user.id, today, via)
  await recordEvent(env.DB, user.id, 'completed', today)
  return json({ ok: true, loggedOn: today, log: entry })
}

async function writeEvent(request: Request, env: Env): Promise<Response> {
  const body = await readBody<EventBody>(request)
  if (!body || body.type !== 'opened') return json({ error: 'type=opened is required' }, 400)

  const user = await resolveUser(env, body)
  if (!user) return unknownUser()

  await recordEvent(env.DB, user.id, 'opened', kstDate())
  return json({ ok: true })
}

/** 오늘 화면에 필요한 전부. 알림 전에 먼저 열어도 예측은 즉석에서 계산한다. */
async function today(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()

  const date = kstDate()
  const log = await findLog(env.DB, user.id, date)
  const daily = (await questionsOn(env.DB, user.id, date)).find((q) => q.intent === 'daily')
  const prediction = daily
    ? parsePrediction(daily.prediction)
    : predictFromHistory(await sameWeekdayLogs(env.DB, user.id, date))

  return json({
    loggedOn: date,
    log,
    questionId: daily?.id ?? null,
    prediction,
    settings: settingsOf(user),
  })
}

/** 서비스워커 전용. 푸시를 받은 순간 보여줄 알림 목록. */
async function inbox(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()

  const notifications = buildInbox(await questionsOn(env.DB, user.id, kstDate()))
  return json({ userId: user.id, notifications })
}

/** 흐름 화면. 최근 N 일 기록과 지난 7일 요약. */
async function history(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()

  const requested = Number(url.searchParams.get('days') ?? HISTORY_DAYS_DEFAULT)
  const days = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 7), HISTORY_DAYS_MAX)
    : HISTORY_DAYS_DEFAULT
  const date = kstDate()
  const logs = await logsBetween(env.DB, user.id, shiftDate(date, -(days - 1)), date)
  const weekStart = shiftDate(date, -6)
  const week = summarizeWeek(logs.filter((log) => log.loggedOn >= weekStart))

  return json({ today: date, days, logs, week })
}

async function readMe(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()
  return json({ ...settingsOf(user), slots: NOTIFY_SLOTS })
}

async function updateMe(request: Request, env: Env): Promise<Response> {
  const body = await readBody<MeBody>(request)
  if (!body) return json({ error: 'body is required' }, 400)
  if (body.notifyAt !== undefined && !isNotifySlot(body.notifyAt)) {
    return json({ error: `notifyAt must be one of ${NOTIFY_SLOTS.join('|')}` }, 400)
  }
  if (body.paused !== undefined && typeof body.paused !== 'boolean') {
    return json({ error: 'paused must be boolean' }, 400)
  }

  const user = await resolveUser(env, body)
  if (!user) return unknownUser()

  const notifyAt = isNotifySlot(body.notifyAt) ? body.notifyAt : undefined
  const paused = typeof body.paused === 'boolean' ? body.paused : undefined
  await updateUser(env.DB, user.id, { notifyAt, paused })
  return json({
    userId: user.id,
    notifyAt: notifyAt ?? user.notify_at,
    paused: paused ?? user.paused === 1,
  })
}

/** 데이터 지우기. 사용자 행이 사라지면 기록, 질문, 이벤트가 같이 사라진다. */
async function deleteMe(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()
  await deleteUser(env.DB, user.id)
  return json({ ok: true })
}

/** 응답률. 알림을 보낸 날 중 며칠을 실제로 기록했는지가 전부다. */
async function stats(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()

  const { sent, opened, completed } = await funnel(env.DB, user.id)
  return json({
    sent,
    opened,
    completed,
    responseRate: sent === 0 ? null : Number((completed / sent).toFixed(3)),
  })
}

const ROUTES: Record<string, (request: Request, url: URL, env: Env) => Promise<Response>> = {
  'GET /api/config': async (_request, _url, env) => json({ vapidPublicKey: env.VAPID_PUBLIC_KEY }),
  'POST /api/subscribe': (request, _url, env) => subscribe(request, env),
  'POST /api/log': (request, _url, env) => writeLog(request, env),
  'POST /api/event': (request, _url, env) => writeEvent(request, env),
  'GET /api/today': (_request, url, env) => today(url, env),
  'GET /api/inbox': (_request, url, env) => inbox(url, env),
  'GET /api/history': (_request, url, env) => history(url, env),
  'GET /api/me': (_request, url, env) => readMe(url, env),
  'PATCH /api/me': (request, _url, env) => updateMe(request, env),
  'DELETE /api/me': (_request, url, env) => deleteMe(url, env),
  'GET /api/stats': (_request, url, env) => stats(url, env),
  // 실제 발송 경로를 브라우저 구독 직후 바로 확인하기 위한 통로. 키 없이는 404.
  'POST /api/dispatch': async (request, url, env) => {
    if (!isDispatchAuthorized(request, env.DISPATCH_KEY)) return json({ error: 'not found' }, 404)
    const at = url.searchParams.get('at')
    return json(await dispatch(env.DB, vapidFrom(env), at ? new Date(at) : new Date()))
  },
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    const handler = ROUTES[`${request.method} ${url.pathname}`]
    if (!handler) return json({ error: 'not found' }, 404)
    return handler(request, url, env)
  },

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await dispatch(env.DB, vapidFrom(env))
  },
}
