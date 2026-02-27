import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { getExpiryStatus } from '../types/index.js'
import type {
  CreateFoodItemInput,
  UpdateFoodItemInput,
} from '../types/index.js'

export const foodItemRouter: RouterType = Router()

const toResponse = (item: {
  id: string
  compartmentId: string
  name: string
  category: string
  quantity: number | null
  unit: string | null
  expiryDate: Date | null
  memo: string | null
  createdAt: Date
  updatedAt: Date
}) => ({
  id: item.id,
  compartmentId: item.compartmentId,
  name: item.name,
  category: item.category,
  quantity: item.quantity,
  unit: item.unit,
  expiryDate: item.expiryDate
    ? item.expiryDate.toISOString().split('T')[0]
    : null,
  memo: item.memo,
  expiryStatus: getExpiryStatus(item.expiryDate),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
})

// GET /api/compartments/:compartmentId/food-items
foodItemRouter.get(
  '/compartments/:compartmentId/food-items',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const items = await prisma.foodItem.findMany({
        where: { compartmentId: req.params['compartmentId'] as string },
        orderBy: { createdAt: 'desc' },
      })

      res.json(items.map(toResponse))
    } catch {
      res.status(500).json({ error: 'Failed to fetch food items' })
    }
  },
)

// POST /api/compartments/:compartmentId/food-items
foodItemRouter.post(
  '/compartments/:compartmentId/food-items',
  async (req: Request, res: Response): Promise<void> => {
    const input = req.body as CreateFoodItemInput

    if (!input.name) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    try {
      const item = await prisma.foodItem.create({
        data: {
          compartmentId: req.params['compartmentId'] as string,
          name: input.name,
          category: input.category ?? 'OTHER',
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          memo: input.memo ?? null,
        },
      })

      res.status(201).json(toResponse(item))
    } catch {
      res.status(500).json({ error: 'Failed to create food item' })
    }
  },
)

// PUT /api/food-items/:id
foodItemRouter.put(
  '/food-items/:id',
  async (req: Request, res: Response): Promise<void> => {
    const input = req.body as UpdateFoodItemInput

    try {
      const data: Record<string, unknown> = {}
      if (input.name !== undefined) data['name'] = input.name
      if (input.category !== undefined) data['category'] = input.category
      if (input.quantity !== undefined) data['quantity'] = input.quantity
      if (input.unit !== undefined) data['unit'] = input.unit
      if (input.expiryDate !== undefined)
        data['expiryDate'] = input.expiryDate
          ? new Date(input.expiryDate)
          : null
      if (input.memo !== undefined) data['memo'] = input.memo

      const item = await prisma.foodItem.update({
        where: { id: req.params['id'] as string },
        data,
      })

      res.json(toResponse(item))
    } catch {
      res.status(500).json({ error: 'Failed to update food item' })
    }
  },
)

// DELETE /api/food-items/:id
foodItemRouter.delete(
  '/food-items/:id',
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.foodItem.delete({
        where: { id: req.params['id'] as string },
      })
      res.status(204).send()
    } catch {
      res.status(500).json({ error: 'Failed to delete food item' })
    }
  },
)

// PATCH /api/food-items/:id/move
foodItemRouter.patch(
  '/food-items/:id/move',
  async (req: Request, res: Response): Promise<void> => {
    const { compartmentId } = req.body as { compartmentId?: string }

    if (!compartmentId) {
      res.status(400).json({ error: 'compartmentId is required' })
      return
    }

    try {
      const item = await prisma.foodItem.update({
        where: { id: req.params['id'] as string },
        data: { compartmentId },
      })

      res.json(toResponse(item))
    } catch {
      res.status(500).json({ error: 'Failed to move food item' })
    }
  },
)
