import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { GroupRequest } from '../middleware/group-auth.js'
import { getExpiryStatus, ExpiryStatus } from '../types/index.js'

export const alertRouter: RouterType = Router()

// GET /api/alerts — 유통기한 임박 식재료 (D-3 이내)
alertRouter.get('/', async (req, res: Response): Promise<void> => {
  const { groupId } = req as GroupRequest

  try {
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const items = await prisma.foodItem.findMany({
      where: {
        expiryDate: { lte: threeDaysFromNow },
        compartment: {
          fridge: { groupId },
        },
      },
      include: {
        compartment: {
          include: {
            fridge: { select: { name: true } },
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    const result = items.map((item) => ({
      id: item.id,
      compartmentId: item.compartmentId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
      memo: item.memo,
      expiryStatus: getExpiryStatus(item.expiryDate),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      fridgeName: item.compartment.fridge.name,
      compartmentLabel: item.compartment.label,
    }))

    // expiryDate가 null인 아이템은 제외 (유통기한 미설정)
    const filtered = result.filter((item) => item.expiryStatus !== ExpiryStatus.SAFE)

    res.json(filtered)
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})
