/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { describeEntry, type Entry } from './domain.ts'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0]
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => {
  void self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

type InboxNotification = {
  tag: string
  title: string
  body: string
  url: string
  prediction: Entry | null
  actions: { action: string; title: string }[]
}

type NotificationData = { url: string; prediction: Entry | null }

// 알림 버튼(actions)은 서비스워커 알림에서만 쓰이고 lib.dom 타입에는 빠져 있다.
type ActionNotificationOptions = NotificationOptions & {
  actions?: { action: string; title: string }[]
}

const ICON = '/icon-192.png'
const DEFAULT_URL = '/?from=push'
const REST: Entry = { kind: 'rest', parts: [], intensity: null }

// 서버가 죽었거나 구독이 지워졌을 때도 빈손으로 끝내지 않는다.
const FALLBACK: InboxNotification = {
  tag: 'miri-daily',
  title: '오늘 몸 어떻게 썼어요?',
  body: '3초면 끝나요',
  url: DEFAULT_URL,
  prediction: null,
  actions: [
    { action: 'rest', title: '쉼' },
    { action: 'open', title: '기록하기' },
  ],
}

async function endpoint(): Promise<string | null> {
  const subscription = await self.registration.pushManager.getSubscription()
  return subscription?.endpoint ?? null
}

/**
 * 푸시에는 본문이 없다(암호화 생략). 무엇을 보여줄지는 받은 순간 서버에 묻는다.
 * 같은 tag 는 기존 알림을 교체하므로 여러 번 불려도 중복이 쌓이지 않는다.
 */
async function fetchInbox(): Promise<InboxNotification[]> {
  const current = await endpoint()
  if (!current) return []
  const response = await fetch(`/api/inbox?endpoint=${encodeURIComponent(current)}`)
  if (!response.ok) return []
  const body = (await response.json()) as { notifications: InboxNotification[] }
  return body.notifications
}

function show(notification: InboxNotification): Promise<void> {
  const data: NotificationData = { url: notification.url, prediction: notification.prediction }
  const options: ActionNotificationOptions = {
    body: notification.body,
    icon: ICON,
    badge: ICON,
    tag: notification.tag,
    actions: notification.actions,
    data,
  }
  return self.registration.showNotification(notification.title, options)
}

async function showInbox(): Promise<void> {
  const inbox = await fetchInbox().catch((): InboxNotification[] => [])
  if (inbox.length === 0) {
    await show(FALLBACK)
    return
  }
  await Promise.all(inbox.map(show))
}

self.addEventListener('push', (event) => {
  event.waitUntil(showInbox())
})

/** 알림 버튼으로 바로 답한다. 앱을 열지 않고 끝나는 가장 짧은 경로. */
async function answer(entry: Entry): Promise<void> {
  const current = await endpoint()
  if (!current) throw new Error('no subscription')

  const response = await fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: current, ...entry, via: 'action' }),
  })
  if (!response.ok) throw new Error(`log failed with ${response.status}`)

  const data: NotificationData = { url: DEFAULT_URL, prediction: null }
  await self.registration.showNotification('기록했어요', {
    body: describeEntry(entry),
    icon: ICON,
    badge: ICON,
    tag: 'miri-daily',
    data,
  })
}

async function focusOrOpen(url: string): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  // 이미 열려 있는 창이 있으면 새 탭을 만들지 않는다. 마찰을 줄이는 게 이 앱의 전부다.
  const existing = clients.find((client) => 'focus' in client)
  if (existing) {
    await existing.navigate(url)
    await existing.focus()
    return
  }
  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data as NotificationData | undefined
  const url = data?.url ?? DEFAULT_URL
  event.notification.close()

  const quick =
    event.action === 'accept' && data?.prediction
      ? data.prediction
      : event.action === 'rest'
        ? REST
        : null

  // 버튼 답이 실패하면 앱을 열어 직접 고르게 한다.
  event.waitUntil(quick ? answer(quick).catch(() => focusOrOpen(url)) : focusOrOpen(url))
})
