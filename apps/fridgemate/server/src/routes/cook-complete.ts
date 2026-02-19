import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { GroupRequest } from '../middleware/group-auth.js'

export const cookCompleteRouter: RouterType = Router()

interface CookCompleteBody {
  usedIngredients: string[] // 사용한 재료 이름 목록
}

// POST /api/fridges/:fridgeId/cook-complete
cookCompleteRouter.post('/:fridgeId/cook-complete', async (req, res: Response): Promise<void> => {
  const { groupId } = req as unknown as GroupRequest
  const fridgeId = req.params['fridgeId'] as string
  const { usedIngredients } = req.body as CookCompleteBody

  if (!Array.isArray(usedIngredients) || usedIngredients.length === 0) {
    res.status(400).json({ error: '사용한 재료 목록이 필요합니다' })
    return
  }

  try {
    const fridge = await prisma.fridge.findUnique({
      where: { id: fridgeId },
      include: {
        compartments: {
          include: {
            foodItems: true,
          },
        },
      },
    })

    if (!fridge || fridge.groupId !== groupId) {
      res.status(404).json({ error: 'Fridge not found' })
      return
    }

    // 이름 매칭으로 삭제할 FoodItem ID 수집
    const nameSet = new Set(usedIngredients.map((n) => n.toLowerCase()))
    const deleteIds: string[] = []

    for (const compartment of fridge.compartments) {
      for (const item of compartment.foodItems) {
        if (nameSet.has(item.name.toLowerCase())) {
          deleteIds.push(item.id)
        }
      }
    }

    if (deleteIds.length > 0) {
      await prisma.foodItem.deleteMany({
        where: { id: { in: deleteIds } },
      })
    }

    res.json({
      deletedCount: deleteIds.length,
      requestedCount: usedIngredients.length,
    })
  } catch (error) {
    console.error('Cook complete error:', error)
    res.status(500).json({ error: '요리 완료 처리에 실패했습니다' })
  }
})
