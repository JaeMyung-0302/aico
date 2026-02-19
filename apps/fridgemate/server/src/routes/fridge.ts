import { Router, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { GroupRequest } from '../middleware/group-auth.js'
import { COMPARTMENT_PRESETS, getExpiryStatus, ExpiryStatus } from '../types/index.js'
import type { FridgeType } from '../types/index.js'

export const fridgeRouter: RouterType = Router()

// GET /api/fridges — 그룹의 냉장고 목록
fridgeRouter.get('/', async (req, res: Response): Promise<void> => {
  const { groupId } = req as GroupRequest

  try {
    const fridges = await prisma.fridge.findMany({
      where: { groupId },
      include: {
        compartments: {
          orderBy: { position: 'asc' },
          include: {
            foodItems: { select: { id: true, name: true, expiryDate: true } },
          },
        },
      },
    })

    const result = fridges.map((f) => ({
      id: f.id,
      groupId: f.groupId,
      type: f.type,
      name: f.name,
      compartments: f.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: c.foodItems.length,
        hasExpiringItems: c.foodItems.some((item) => {
          const status = getExpiryStatus(item.expiryDate)
          return status !== ExpiryStatus.SAFE
        }),
        foodItems: c.foodItems.map((fi) => ({ id: fi.id, name: fi.name, expiryDate: fi.expiryDate })),
      })),
    }))

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch fridges' })
  }
})

// GET /api/fridges/:id — 냉장고 상세
fridgeRouter.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const fridge = await prisma.fridge.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        compartments: {
          orderBy: { position: 'asc' },
          include: {
            foodItems: { select: { id: true, name: true, expiryDate: true } },
          },
        },
      },
    })

    if (!fridge) {
      res.status(404).json({ error: 'Fridge not found' })
      return
    }

    res.json({
      id: fridge.id,
      groupId: fridge.groupId,
      type: fridge.type,
      name: fridge.name,
      compartments: fridge.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: c.foodItems.length,
        hasExpiringItems: c.foodItems.some((item) => {
          const status = getExpiryStatus(item.expiryDate)
          return status !== ExpiryStatus.SAFE
        }),
        foodItems: c.foodItems.map((fi) => ({ id: fi.id, name: fi.name, expiryDate: fi.expiryDate })),
      })),
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch fridge' })
  }
})

// POST /api/fridges — 냉장고 생성 + 칸 자동생성
fridgeRouter.post('/', async (req, res: Response): Promise<void> => {
  const { groupId } = req as GroupRequest
  const { type, name } = req.body as { type?: FridgeType; name?: string }

  if (!type || !name) {
    res.status(400).json({ error: 'type and name are required' })
    return
  }

  const presets = COMPARTMENT_PRESETS[type]
  if (!presets) {
    res.status(400).json({ error: 'Invalid fridge type' })
    return
  }

  try {
    const fridge = await prisma.fridge.create({
      data: {
        groupId,
        type,
        name,
        compartments: {
          create: presets.map((p) => ({
            type: p.type,
            label: p.label,
            position: p.position,
          })),
        },
      },
      include: {
        compartments: {
          orderBy: { position: 'asc' },
        },
      },
    })

    res.status(201).json({
      id: fridge.id,
      groupId: fridge.groupId,
      type: fridge.type,
      name: fridge.name,
      compartments: fridge.compartments.map((c) => ({
        id: c.id,
        fridgeId: c.fridgeId,
        type: c.type,
        label: c.label,
        position: c.position,
        itemCount: 0,
        hasExpiringItems: false,
        foodItems: [],
      })),
    })
  } catch {
    res.status(500).json({ error: 'Failed to create fridge' })
  }
})

// PUT /api/fridges/:id — 냉장고 수정 (이름 변경)
fridgeRouter.put('/:id', async (req, res: Response): Promise<void> => {
  const { name } = req.body as { name?: string }

  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  try {
    const fridge = await prisma.fridge.update({
      where: { id: req.params['id'] as string },
      data: { name },
    })

    res.json({ id: fridge.id, type: fridge.type, name: fridge.name })
  } catch {
    res.status(500).json({ error: 'Failed to update fridge' })
  }
})

// DELETE /api/fridges/:id — 냉장고 삭제 (cascade)
fridgeRouter.delete('/:id', async (req, res: Response): Promise<void> => {
  try {
    await prisma.fridge.delete({ where: { id: req.params['id'] as string } })
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Failed to delete fridge' })
  }
})
