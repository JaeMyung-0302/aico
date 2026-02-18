import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'

export const partyRouter: IRouter = Router()

// GET /api/party - 내 파티 조회
partyRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const party = await prisma.party.findUnique({
      where: { userId: user.id },
      include: {
        slot1: { include: { species: true } },
        slot2: { include: { species: true } },
        slot3: { include: { species: true } },
      },
    })

    res.json(party)
  } catch {
    res.status(500).json({ error: 'Failed to fetch party' })
  }
})

// PUT /api/party - 파티 편성
partyRouter.put('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { slot1Id, slot2Id, slot3Id } = req.body as {
      slot1Id: string | null
      slot2Id: string | null
      slot3Id: string | null
    }

    // 소유권 검증
    const slotIds = [slot1Id, slot2Id, slot3Id].filter(Boolean) as string[]
    if (slotIds.length > 0) {
      const monsters = await prisma.monster.findMany({
        where: { id: { in: slotIds }, userId: user.id },
      })
      if (monsters.length !== slotIds.length) {
        res.status(400).json({ error: 'Invalid monster in party' })
        return
      }

      // 중복 체크
      if (new Set(slotIds).size !== slotIds.length) {
        res.status(400).json({ error: 'Duplicate monster in party' })
        return
      }
    }

    const party = await prisma.party.upsert({
      where: { userId: user.id },
      update: { slot1Id, slot2Id, slot3Id },
      create: { userId: user.id, slot1Id, slot2Id, slot3Id },
    })

    res.json(party)
  } catch {
    res.status(500).json({ error: 'Failed to update party' })
  }
})
