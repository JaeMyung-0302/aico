import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const cookCompleteRouter: RouterType = Router()

interface CookCompleteBody {
  usedIngredients: string[]
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/fridges/:fridgeId/cook-complete
cookCompleteRouter.post(
  '/:fridgeId/cook-complete',
  async (req, res: Response): Promise<void> => {
    const { groupId } = req as unknown as AuthRequest
    const fridgeId = req.params['fridgeId'] as string

    if (!UUID_REGEX.test(fridgeId)) {
      res.status(400).json({ error: 'Invalid fridge ID' })
      return
    }

    const { usedIngredients } = req.body as CookCompleteBody

    if (
      !Array.isArray(usedIngredients) ||
      usedIngredients.length === 0 ||
      usedIngredients.length > 50 ||
      !usedIngredients.every(
        (n): n is string =>
          typeof n === 'string' && n.trim().length > 0 && n.length <= 100,
      )
    ) {
      res.status(400).json({ error: '유효한 재료 목록이 필요합니다 (1~50개)' })
      return
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const fridge = await tx.fridge.findUnique({
          where: { id: fridgeId },
          include: {
            compartments: {
              include: {
                foodItems: true,
              },
            },
          },
        })

        if (!fridge || fridge.groupId !== groupId) return null

        const nameSet = new Set(usedIngredients.map((n) => n.toLowerCase()))
        const deleteIds = fridge.compartments
          .flatMap((c) => c.foodItems)
          .filter((item) => nameSet.has(item.name.toLowerCase()))
          .map((item) => item.id)

        if (deleteIds.length > 0) {
          await tx.foodItem.deleteMany({
            where: { id: { in: deleteIds } },
          })
        }

        return { deletedCount: deleteIds.length }
      })

      if (!result) {
        res.status(404).json({ error: 'Fridge not found' })
        return
      }

      res.json({
        deletedCount: result.deletedCount,
        requestedCount: usedIngredients.length,
      })
    } catch (error) {
      console.error(
        'Cook complete error:',
        error instanceof Error ? error.message : error,
      )
      res.status(500).json({ error: '요리 완료 처리에 실패했습니다' })
    }
  },
)
