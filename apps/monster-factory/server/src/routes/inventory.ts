import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'

export const inventoryRouter: IRouter = Router()

// GET /api/inventory - 장비 목록
inventoryRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const equipment = await prisma.equipment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json(equipment)
  } catch {
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
})

// POST /api/inventory/equip - 장비 장착
inventoryRouter.post('/equip', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { equipmentId, monsterId } = req.body as { equipmentId: string; monsterId?: string }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    })
    if (!equipment || equipment.userId !== user.id) {
      res.status(404).json({ error: 'Equipment not found' })
      return
    }

    // monsterId 지정 시 해당 몬스터, 아니면 첫 번째
    const monster = monsterId
      ? await prisma.monster.findUnique({ where: { id: monsterId } })
      : await prisma.monster.findFirst({ where: { userId: user.id } })
    if (!monster || monster.userId !== user.id) {
      res.status(404).json({ error: 'Monster not found' })
      return
    }

    // 같은 슬롯의 기존 장비 해제
    await prisma.equipment.updateMany({
      where: {
        userId: user.id,
        monsterId: monster.id,
        slot: equipment.slot,
      },
      data: { monsterId: null },
    })

    // 새 장비 장착
    const updated = await prisma.equipment.update({
      where: { id: equipmentId },
      data: { monsterId: monster.id },
    })

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Failed to equip item' })
  }
})

// POST /api/inventory/unequip - 장비 해제
inventoryRouter.post('/unequip', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { equipmentId } = req.body as { equipmentId: string }

    const updated = await prisma.equipment.update({
      where: { id: equipmentId, userId: user.id },
      data: { monsterId: null },
    })

    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Failed to unequip item' })
  }
})
