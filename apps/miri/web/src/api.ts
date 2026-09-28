import type { Answer, Choice, TrackId, TrackSettings } from './domain.ts'

export type Settings = { userId: string; paused: boolean; tracks: TrackSettings[] }

export type TodayTrack = {
  track: TrackId
  notifyAt: string
  log: Answer | null
  /** 기록 직후 돌려받은 한마디. 할 말이 없던 날은 null */
  feedback: string | null
  questionId: string | null
  questionText: string | null
  prediction: Answer | null
  /** 오늘 포함 최근 7일 중 기록한 날 수 */
  weekDays: number
  /** 사용자가 직접 더한 선택지. 묶음 단계 키별. 한 번 더한 종목이 다음부터 칩으로 나온다. */
  custom: Record<string, Choice[]>
}

export type Today = { loggedOn: string; paused: boolean; tracks: TodayTrack[] }

export type HistoryLog = { loggedOn: string; answer: Answer }

export type History = {
  today: string
  days: number
  track: TrackId
  logs: HistoryLog[]
  /** 이 트랙의 지난 7일 요약 */
  weekText: string
  /** 켜진 트랙 전부의 요약, 줄바꿈 구분 */
  allText: string
}

/** 저장 결과 중 화면이 이어 쓰는 부분. */
export type SavedLog = { answer: Answer; feedback: string | null; weekDays: number }

/** 어떻게 답했는지. 예측 수락, 직접 선택, 알림 버튼. */
export type LogVia = 'predict' | 'pick' | 'action'

/** 서버에 구독이 남아 있지 않다는 신호. 클라이언트는 재구독으로 복구해야 한다. */
export class UnknownUserError extends Error {
  constructor() {
    super('구독이 만료되어 다시 등록해야 합니다')
    this.name = 'UnknownUserError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (response.status === 404) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    if (body?.error === 'unknown_user') throw new UnknownUserError()
  }
  if (!response.ok) throw new Error(`${path} failed with ${response.status}`)

  return response.json() as Promise<T>
}

function withUser(path: string, userId: string): string {
  return `${path}?userId=${encodeURIComponent(userId)}`
}

export type TrackPatch = { track: TrackId } & Partial<Omit<TrackSettings, 'track'>>

export function fetchVapidKey(): Promise<{ vapidPublicKey: string }> {
  return request('/api/config')
}

export function subscribe(subscription: {
  endpoint: string
  p256dh: string
  auth: string
  tracks: TrackPatch[]
}): Promise<Settings> {
  return request('/api/subscribe', { method: 'POST', body: JSON.stringify(subscription) })
}

export function writeLog(entry: {
  userId: string
  track: TrackId
  answer: Answer
  via: LogVia
}): Promise<SavedLog & { ok: true; loggedOn: string; track: TrackId; feedbackPending: boolean }> {
  return request('/api/log', { method: 'POST', body: JSON.stringify(entry) })
}

/** 저장 직후 한 번. AI 가 규칙 문장을 다듬어 돌려준다. 실패하면 규칙 문장 그대로. */
export function refineFeedback(userId: string, track: TrackId): Promise<{ feedback: string | null }> {
  return request('/api/feedback', { method: 'POST', body: JSON.stringify({ userId, track }) })
}

export function markOpened(userId: string): Promise<{ ok: true }> {
  return request('/api/event', { method: 'POST', body: JSON.stringify({ userId, type: 'opened' }) })
}

export function fetchToday(userId: string): Promise<Today> {
  return request(withUser('/api/today', userId))
}

export function fetchHistory(userId: string, track: TrackId, days: number): Promise<History> {
  return request(`${withUser('/api/history', userId)}&track=${track}&days=${days}`)
}

export function fetchMe(userId: string): Promise<Settings> {
  return request(withUser('/api/me', userId))
}

export function updateMe(
  userId: string,
  patch: { paused?: boolean; tracks?: TrackPatch[] },
): Promise<Settings> {
  return request('/api/me', { method: 'PATCH', body: JSON.stringify({ userId, ...patch }) })
}

export function deleteMe(userId: string): Promise<{ ok: true }> {
  return request(withUser('/api/me', userId), { method: 'DELETE' })
}
