import { fetchVapidKey, subscribe } from './api.ts'
import type { NotifySlot } from './domain.ts'

const USER_ID_KEY = 'miri.userId'

export function storedUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY)
}

export function forgetUser(): void {
  localStorage.removeItem(USER_ID_KEY)
}

function toUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  // applicationServerKey 는 BufferSource 를 요구하므로 ArrayBuffer 로 뒷받침되는 뷰여야 한다.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function encodeKey(buffer: ArrayBuffer | null): string {
  if (!buffer) throw new Error('subscription key missing')
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 는 display-mode 대신 이 플래그를 쓴다.
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** 알림 권한을 받고 푸시를 구독한 뒤 서버에 등록한다. 성공하면 userId 를 돌려준다. */
export async function enableNotifications(notifyAt: NotifySlot): Promise<string> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('알림 권한이 필요합니다')

  const registration = await navigator.serviceWorker.ready
  const { vapidPublicKey } = await fetchVapidKey()
  const existing = await registration.pushManager.getSubscription()
  const pushSubscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(vapidPublicKey),
    }))

  const { userId } = await subscribe({
    endpoint: pushSubscription.endpoint,
    p256dh: encodeKey(pushSubscription.getKey('p256dh')),
    auth: encodeKey(pushSubscription.getKey('auth')),
    notifyAt,
  })

  localStorage.setItem(USER_ID_KEY, userId)
  return userId
}
