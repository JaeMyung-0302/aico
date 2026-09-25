import { aiComposers } from './ai.ts'
import { isDispatchAuthorized } from './auth.ts'
import {
  answerDailyQuestion,
  deleteUser,
  findLog,
  findUser,
  findUserByEndpoint,
  funnel,
  insertUser,
  listTracks,
  logsBetween,
  parsePrediction,
  questionsOn,
  recordEvent,
  sameWeekdayLogs,
  setPaused,
  upsertLog,
  upsertTrack,
  weekDaysLogged,
  type AnsweredVia,
  type UserRow,
} from './db.ts'
import { dispatch, templateComposers, weeklyText, type Composers } from './dispatch.ts'
import { fullTrackSettings, isNotifyTime, isOffDays, type TrackSettings } from './domain.ts'
import { buildInbox } from './inbox.ts'
import { kstDate, shiftDate } from './kst.ts'
import { predictFromHistory } from './predict.ts'
import { isTrackId, normalizeAnswer, summarizeTrackWeek, TRACKS, type TrackId } from './tracks.ts'

export type Env = {
  DB: D1Database
  ASSETS: Fetcher
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  /** 수동 발송 허용 키. 비어 있으면 /api/dispatch 는 존재하지 않는다. */
  DISPATCH_KEY?: string
  /** 있으면 질문 문구와 주간 요약을 AI 가 쓴다. 없으면 템플릿. */
  ANTHROPIC_API_KEY?: string
  /** 비우면 Opus 5. 규모가 커지면 배포 없이 Sonnet 5 로 내린다. */
  AI_MODEL?: string
}

function composersFrom(env: Env): Composers {
  if (!env.ANTHROPIC_API_KEY) return templateComposers
  return aiComposers(env.ANTHROPIC_API_KEY, env.AI_MODEL || undefined)
}

const HISTORY_DAYS_DEFAULT = 35
const HISTORY_DAYS_MAX = 120
const ANSWERED_VIA: AnsweredVia[] = ['predict', 'pick', 'action']

type Identity = { userId?: unknown; endpoint?: unknown }
type TrackPatch = { track?: unknown; enabled?: unknown; notifyAt?: unknown; remind?: unknown; offDays?: unknown }
type SubscribeBody = { endpoint?: string; p256dh?: string; auth?: string; tracks?: unknown }
type LogBody = Identity & { track?: unknown; answer?: unknown; via?: unknown }
type EventBody = Identity & { type?: unknown }
type MeBody = Identity & { paused?: unknown; tracks?: unknown }

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

/** 트랙 설정 patch 목록을 검증한다. 하나라도 틀리면 사유를 돌려준다. */
function parseTrackPatches(
  raw: unknown,
): { patches: { track: TrackId; patch: Partial<Omit<TrackSettings, 'track'>> }[] } | { error: string } {
  if (raw === undefined) return { patches: [] }
  if (!Array.isArray(raw)) return { error: 'tracks must be an array' }

  const patches: { track: TrackId; patch: Partial<Omit<TrackSettings, 'track'>> }[] = []
  for (const item of raw as TrackPatch[]) {
    if (!isTrackId(item?.track)) return { error: `track must be one of ${Object.keys(TRACKS).join('|')}` }
    if (item.notifyAt !== undefined && !isNotifyTime(item.notifyAt)) {
      return { error: 'notifyAt must be HH:MM in 10 minute steps' }
    }
    if (item.enabled !== undefined && typeof item.enabled !== 'boolean') return { error: 'enabled must be boolean' }
    if (item.remind !== undefined && typeof item.remind !== 'boolean') return { error: 'remind must be boolean' }
    if (item.offDays !== undefined && !isOffDays(item.offDays)) return { error: 'offDays must be weekday numbers 0-6' }

    const patch: Partial<Omit<TrackSettings, 'track'>> = {}
    if (isNotifyTime(item.notifyAt)) patch.notifyAt = item.notifyAt
    if (typeof item.enabled === 'boolean') patch.enabled = item.enabled
    if (typeof item.remind === 'boolean') patch.remind = item.remind
    if (isOffDays(item.offDays)) patch.offDays = item.offDays
    patches.push({ track: item.track, patch })
  }
  return { patches }
}

async function settingsOf(env: Env, user: UserRow) {
  return { userId: user.id, paused: user.paused === 1, tracks: fullTrackSettings(await listTracks(env.DB, user.id)) }
}

// ── routes ─────────────────────────────────────────────────────

async function subscribe(request: Request, env: Env): Promise<Response> {
  const body = await readBody<SubscribeBody>(request)
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return json({ error: 'endpoint, p256dh, auth are required' }, 400)
  }
  const parsed = parseTrackPatches(body.tracks)
  if ('error' in parsed) return json({ error: parsed.error }, 400)

  // 같은 브라우저가 재구독하면 endpoint 가 같으므로 기존 행을 그대로 쓴다.
  const existing = await findUserByEndpoint(env.DB, body.endpoint)
  const user: UserRow = existing ?? {
    id: await insertUser(env.DB, { endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth }),
    endpoint: body.endpoint,
    p256dh: body.p256dh,
    auth: body.auth,
    paused: 0,
  }

  // 트랙을 안 고르고 온 첫 구독은 운동 하나로 시작한다.
  const patches = parsed.patches.length > 0 || existing ? parsed.patches : [{ track: 'exercise' as const, patch: {} }]
  for (const { track, patch } of patches) await upsertTrack(env.DB, user.id, track, { enabled: true, ...patch })

  return json(await settingsOf(env, user), existing ? 200 : 201)
}

async function writeLog(request: Request, env: Env): Promise<Response> {
  const body = await readBody<LogBody>(request)
  if (!body || !isTrackId(body.track)) return json({ error: 'track is required' }, 400)
  const answer = normalizeAnswer(TRACKS[body.track], body.answer)
  if (!answer) return json({ error: 'answer does not match the track' }, 400)

  const user = await resolveUser(env, body)
  if (!user) return unknownUser()

  const via = ANSWERED_VIA.find((value) => value === body.via) ?? 'pick'
  const today = kstDate()
  await upsertLog(env.DB, user.id, body.track, today, answer)
  await answerDailyQuestion(env.DB, user.id, body.track, today, via)
  await recordEvent(env.DB, user.id, 'completed', today)
  const weekDays = await weekDaysLogged(env.DB, user.id, body.track, today)
  return json({ ok: true, loggedOn: today, track: body.track, answer, weekDays })
}

async function writeEvent(request: Request, env: Env): Promise<Response> {
  const body = await readBody<EventBody>(request)
  if (!body || body.type !== 'opened') return json({ error: 'type=opened is required' }, 400)

  const user = await resolveUser(env, body)
  if (!user) return unknownUser()

  await recordEvent(env.DB, user.id, 'opened', kstDate())
  return json({ ok: true })
}

/** 오늘 화면에 필요한 전부. 켜진 트랙마다 기록, 예측, 이번 주 일수. */
async function today(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()

  const date = kstDate()
  const settings = await settingsOf(env, user)
  const questions = await questionsOn(env.DB, user.id, date)

  const tracks = []
  for (const item of settings.tracks) {
    if (!item.enabled) continue
    const log = await findLog(env.DB, user.id, item.track, date)
    const daily = questions.find((q) => q.intent === 'daily' && q.track === item.track)
    const prediction = daily
      ? parsePrediction(item.track, daily.prediction)
      : predictFromHistory(await sameWeekdayLogs(env.DB, user.id, item.track, date))
    tracks.push({
      track: item.track,
      notifyAt: item.notifyAt,
      log,
      questionId: daily?.id ?? null,
      questionText: daily?.text ?? null,
      prediction,
      weekDays: await weekDaysLogged(env.DB, user.id, item.track, date),
    })
  }

  return json({ loggedOn: date, paused: settings.paused, tracks })
}

/** 서비스워커 전용. 푸시를 받은 순간 보여줄 알림 목록. */
async function inbox(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()

  const notifications = buildInbox(await questionsOn(env.DB, user.id, kstDate()))
  return json({ userId: user.id, notifications })
}

/** 흐름 화면. 한 트랙의 최근 N 일 기록과 지난 7일 요약. */
async function history(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()
  const track = url.searchParams.get('track') ?? 'exercise'
  if (!isTrackId(track)) return json({ error: 'unknown track' }, 400)

  const requested = Number(url.searchParams.get('days') ?? HISTORY_DAYS_DEFAULT)
  const days = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 7), HISTORY_DAYS_MAX)
    : HISTORY_DAYS_DEFAULT
  const date = kstDate()
  const logs = await logsBetween(env.DB, user.id, track, shiftDate(date, -(days - 1)), date)
  const weekStart = shiftDate(date, -6)
  const weekText = summarizeTrackWeek(
    TRACKS[track],
    logs.filter((log) => log.loggedOn >= weekStart).map((log) => log.answer),
  )

  return json({ today: date, days, track, logs, weekText, allText: await weeklyText(env.DB, user.id, date) })
}

async function readMe(url: URL, env: Env): Promise<Response> {
  const user = await resolveUser(env, identityFrom(url))
  if (!user) return unknownUser()
  return json(await settingsOf(env, user))
}

async function updateMe(request: Request, env: Env): Promise<Response> {
  const body = await readBody<MeBody>(request)
  if (!body) return json({ error: 'body is required' }, 400)
  if (body.paused !== undefined && typeof body.paused !== 'boolean') {
    return json({ error: 'paused must be boolean' }, 400)
  }
  const parsed = parseTrackPatches(body.tracks)
  if ('error' in parsed) return json({ error: parsed.error }, 400)

  const user = await resolveUser(env, body)
  if (!user) return unknownUser()

  if (typeof body.paused === 'boolean') await setPaused(env.DB, user.id, body.paused)
  for (const { track, patch } of parsed.patches) await upsertTrack(env.DB, user.id, track, patch)

  const fresh = (await findUser(env.DB, user.id)) ?? user
  return json(await settingsOf(env, fresh))
}

/** 데이터 지우기. 사용자 행이 사라지면 트랙, 기록, 질문, 이벤트가 같이 사라진다. */
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
    return json(await dispatch(env.DB, vapidFrom(env), at ? new Date(at) : new Date(), composersFrom(env)))
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
    await dispatch(env.DB, vapidFrom(env), new Date(), composersFrom(env))
  },
}
