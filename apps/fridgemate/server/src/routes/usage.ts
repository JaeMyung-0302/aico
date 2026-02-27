import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { getKSTWeekStart } from '../lib/date.js'
import { AuthRequest } from '../middleware/auth.js'
import { FREE_WEEKLY_LIMIT } from '../middleware/usage-check.js'

export const usageRouter: RouterType = Router()

// GET /api/usage/remaining — 이번 주 남은 추천 횟수 조회
usageRouter.get('/remaining', async (req, res: Response): Promise<void> => {
  const { groupId } = req as unknown as AuthRequest

  try {
    const [group, usage] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { isPremium: true, premiumExpiresAt: true },
      }),
      prisma.dailyUsage.findUnique({
        where: { groupId_date: { groupId, date: getKSTWeekStart() } },
      }),
    ])

    const isPremium = !!(
      group?.isPremium &&
      group.premiumExpiresAt &&
      group.premiumExpiresAt > new Date()
    )
    const remainingCount = isPremium
      ? -1
      : Math.max(0, FREE_WEEKLY_LIMIT - (usage?.count ?? 0))
    res.json({ remainingCount, isPremium })
  } catch {
    res.status(500).json({ error: 'Failed to check remaining count' })
  }
})
