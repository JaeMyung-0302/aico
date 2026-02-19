import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:dev@fridgemate.local'

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 미설정 — Push 알림 비활성화')
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface PushPayload {
  title: string
  body: string
  url?: string
}

export const sendPushToGroup = async (groupId: string, payload: PushPayload): Promise<void> => {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { groupId },
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        )
      } catch (err) {
        // 410 Gone 또는 404: 구독 만료 → 자동 삭제
        if (err instanceof webpush.WebPushError && (err.statusCode === 410 || err.statusCode === 404)) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
          return // 만료된 구독 정리는 정상 처리
        }
        throw err
      }
    }),
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`[Push] ${failed}/${subscriptions.length} 발송 실패 (groupId: ${groupId})`)
  }
}

export const getVapidPublicKey = (): string => VAPID_PUBLIC_KEY
