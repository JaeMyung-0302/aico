import type { Entry, Kind, NotifySlot, Part } from './domain.ts'

export type Settings = { userId: string; notifyAt: NotifySlot; paused: boolean }

export type Today = {
  loggedOn: string
  log: Entry | null
  questionId: string | null
  prediction: Entry | null
  settings: Settings
}

export type HistoryLog = Entry & { loggedOn: string }

export type Week = {
  kindCounts: Record<Kind, number>
  partCounts: Record<Part, number>
  text: string
}

export type History = { today: string; days: number; logs: HistoryLog[]; week: Week }

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

export function fetchVapidKey(): Promise<{ vapidPublicKey: string }> {
  return request('/api/config')
}

export function subscribe(subscription: {
  endpoint: string
  p256dh: string
  auth: string
  notifyAt: NotifySlot
}): Promise<Settings> {
  return request('/api/subscribe', { method: 'POST', body: JSON.stringify(subscription) })
}

export function writeLog(entry: {
  userId: string
  kind: Kind
  parts: Part[]
  intensity: Entry['intensity']
  via: LogVia
}): Promise<{ ok: true; loggedOn: string; log: Entry }> {
  return request('/api/log', { method: 'POST', body: JSON.stringify(entry) })
}

export function markOpened(userId: string): Promise<{ ok: true }> {
  return request('/api/event', { method: 'POST', body: JSON.stringify({ userId, type: 'opened' }) })
}

export function fetchToday(userId: string): Promise<Today> {
  return request(withUser('/api/today', userId))
}

export function fetchHistory(userId: string, days: number): Promise<History> {
  return request(`${withUser('/api/history', userId)}&days=${days}`)
}

export function updateMe(
  userId: string,
  patch: { notifyAt?: NotifySlot; paused?: boolean },
): Promise<Settings> {
  return request('/api/me', { method: 'PATCH', body: JSON.stringify({ userId, ...patch }) })
}

export function deleteMe(userId: string): Promise<{ ok: true }> {
  return request(withUser('/api/me', userId), { method: 'DELETE' })
}
