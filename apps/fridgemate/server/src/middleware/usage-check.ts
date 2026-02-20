import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { getKSTToday } from '../lib/date.js'
import type { GroupRequest } from './group-auth.js'

export const FREE_DAILY_LIMIT = 2

export const usageCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { groupId } = req as GroupRequest

  const today = getKSTToday()

  try {
    const usage = await prisma.dailyUsage.findUnique({
      where: { groupId_date: { groupId, date: today } },
    })

    const currentCount = usage?.count ?? 0

    if (currentCount >= FREE_DAILY_LIMIT) {
      res.status(403).json({
        error: '오늘의 무료 추천 횟수를 모두 사용했습니다',
        remainingCount: 0,
      })
      return
    }

    next()
  } catch {
    res.status(500).json({ error: 'Failed to check usage' })
  }
}
