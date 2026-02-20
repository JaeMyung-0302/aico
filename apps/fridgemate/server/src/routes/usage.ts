import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { getKSTToday } from '../lib/date.js'
import { GroupRequest } from '../middleware/group-auth.js'
import { FREE_DAILY_LIMIT } from '../middleware/usage-check.js'

export const usageRouter: RouterType = Router()

// GET /api/usage/remaining — 오늘 남은 추천 횟수 조회
usageRouter.get('/remaining', async (req, res: Response): Promise<void> => {
  const { groupId } = req as unknown as GroupRequest

  try {
    const today = getKSTToday()
    const usage = await prisma.dailyUsage.findUnique({
      where: { groupId_date: { groupId, date: today } },
    })

    const remainingCount = Math.max(0, FREE_DAILY_LIMIT - (usage?.count ?? 0))
    res.json({ remainingCount })
  } catch {
    res.status(500).json({ error: 'Failed to check remaining count' })
  }
})
