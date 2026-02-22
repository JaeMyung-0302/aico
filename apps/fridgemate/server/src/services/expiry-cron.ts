import cron from 'node-cron'
import { prisma } from '../lib/prisma.js'
import { sendPushToGroup } from './push-notification.js'

// 매일 09:00 실행 — 유통기한 임박 식품 Push 알림
export const startExpiryCron = (): void => {
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] 유통기한 알림 체크 시작')

    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const d1 = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
      const d3 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)

      // D-0 (당일 만료) ~ D-3 식품만 조회 (과거 만료 제외)
      const expiringItems = await prisma.foodItem.findMany({
        where: {
          expiryDate: { gte: today, lte: d3 },
        },
        include: {
          compartment: {
            include: {
              fridge: {
                include: { group: true },
              },
            },
          },
        },
      })

      // 그룹별로 묶기
      const groupItems = new Map<string, { groupId: string; items: string[] }>()

      for (const item of expiringItems) {
        const groupId = item.compartment.fridge.group.id
        const entry = groupItems.get(groupId) ?? { groupId, items: [] }

        const expiry = item.expiryDate ? new Date(item.expiryDate) : null
        if (!expiry) continue

        const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        let label = ''
        if (diffDays <= 0) label = '[만료]'
        else if (diffDays <= 1) label = '[D-1]'
        else label = '[D-3]'

        entry.items.push(`${label} ${item.name}`)
        groupItems.set(groupId, entry)
      }

      // 각 그룹에 Push 발송
      for (const [, { groupId, items }] of groupItems) {
        const hasSubscriptions = await prisma.pushSubscription.count({
          where: { groupId },
        })

        if (hasSubscriptions === 0) continue

        await sendPushToGroup(groupId, {
          title: `유통기한 알림 (${items.length}개)`,
          body: items.slice(0, 3).join(', ') + (items.length > 3 ? ` 외 ${items.length - 3}개` : ''),
          url: '/fridge',
        })
      }

      console.log(`[Cron] ${groupItems.size}개 그룹에 알림 발송 완료`)
    } catch (err) {
      console.error('[Cron] 유통기한 알림 실패:', err)
    }
  })

  console.log('[Cron] 유통기한 알림 스케줄러 등록 (매일 09:00)')

  // 매일 00:05 실행 — 프리미엄 만료 체크
  cron.schedule('5 0 * * *', async () => {
    try {
      const result = await prisma.group.updateMany({
        where: { isPremium: true, premiumExpiresAt: { lt: new Date() } },
        data: { isPremium: false },
      })
      if (result.count > 0) {
        console.log(`[Cron] ${result.count}개 그룹 프리미엄 만료 처리`)
      }
    } catch (err) {
      console.error('[Cron] 프리미엄 만료 체크 실패:', err)
    }
  })

  console.log('[Cron] 프리미엄 만료 스케줄러 등록 (매일 00:05)')
}
