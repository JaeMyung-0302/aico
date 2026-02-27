import { api } from './api'

const SW_PUSH_PATH = '/sw-push.js'

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export const subscribeToPush = async (): Promise<boolean> => {
  if (!isPushSupported()) return false

  try {
    // Push 전용 SW 등록 (이미 등록되어 있으면 재사용)
    let registration =
      await navigator.serviceWorker.getRegistration(SW_PUSH_PATH)
    if (!registration) {
      registration = await navigator.serviceWorker.register(SW_PUSH_PATH)
    }
    await registration.update()

    // VAPID 공개키 가져오기
    const { publicKey } = await api.get<{ publicKey: string }>(
      '/push/vapid-public-key',
    )
    if (!publicKey) return false

    // 알림 권한 요청
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    // Push 구독
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
        .buffer as ArrayBuffer,
    })

    const subscriptionJson = subscription.toJSON()

    // 서버에 구독 정보 전송
    await api.post('/push/subscribe', {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh ?? '',
        auth: subscriptionJson.keys?.auth ?? '',
      },
    })

    return true
  } catch (err) {
    console.error('[Push] 구독 실패:', err)
    return false
  }
}

export const unsubscribeFromPush = async (): Promise<boolean> => {
  if (!isPushSupported()) return false

  try {
    const registration =
      await navigator.serviceWorker.getRegistration(SW_PUSH_PATH)
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return false

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    await api.post('/push/unsubscribe', { endpoint })

    return true
  } catch (err) {
    console.error('[Push] 구독 해제 실패:', err)
    return false
  }
}

export const isPushSubscribed = async (): Promise<boolean> => {
  if (!isPushSupported()) return false

  try {
    const registration =
      await navigator.serviceWorker.getRegistration(SW_PUSH_PATH)
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}
