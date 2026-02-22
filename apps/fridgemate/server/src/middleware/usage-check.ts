import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { getKSTWeekStart } from '../lib/date.js'
import type { AuthRequest } from './auth.js'

export const FREE_WEEKLY_LIMIT = 1

export const usageCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { groupId } = req as AuthRequest

  const weekStart = getKSTWeekStart()

  try {
    // 프리미엄 그룹은 무제한
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { isPremium: true, premiumExpiresAt: true },
    })

    if (group?.isPremium && group.premiumExpiresAt && group.premiumExpiresAt > new Date()) {
      next()
      return
    }

    const usage = await prisma.dailyUsage.findUnique({
      where: { groupId_date: { groupId, date: weekStart } },
    })

    const currentCount = usage?.count ?? 0

    if (currentCount >= FREE_WEEKLY_LIMIT) {
      res.status(403).json({
        error: '이번 주 무료 추천 횟수를 모두 사용했습니다',
        remainingCount: 0,
      })
      return
    }

    next()
  } catch {
    res.status(500).json({ error: 'Failed to check usage' })
  }
}
