import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { toMonsterResponse } from '../lib/transform.js'
import { executeEvolution } from '../engine/evolution.js'
import { executeFusion } from '../engine/fusion.js'
import type { AuthRequest } from '../middleware/auth.js'

export const monsterRouter: IRouter = Router()

// GET /api/monsters - 보유 몬스터 목록
monsterRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const monsters = await prisma.monster.findMany({
      where: { userId: user.id },
      include: { species: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json(monsters.map(toMonsterResponse))
  } catch {
    res.status(500).json({ error: 'Failed to fetch monsters' })
  }
})

// POST /api/monsters/fuse - 합성 실행 (/:id 라우트 전에 등록 필요)
monsterRouter.post('/fuse', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { parent1Id, parent2Id } = req.body as { parent1Id: string; parent2Id: string }
    if (!parent1Id || !parent2Id) {
      res.status(400).json({ error: 'parent1Id and parent2Id required' })
      return
    }
    if (parent1Id === parent2Id) {
      res.status(400).json({ error: 'Cannot fuse the same monster' })
      return
    }

    const result = await executeFusion(user.id, parent1Id, parent2Id)
    res.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(400).json({ error: msg })
  }
})

// GET /api/monsters/me - 첫 번째 몬스터 (하위호환)
monsterRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const monster = await prisma.monster.findFirst({
      where: { userId: user.id },
      include: { species: true },
      orderBy: { createdAt: 'asc' },
    })

    res.json(monster ? toMonsterResponse(monster) : null)
  } catch {
    res.status(500).json({ error: 'Failed to fetch monster' })
  }
})

// GET /api/monsters/:id - 몬스터 상세
monsterRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const monster = await prisma.monster.findUnique({
      where: { id: req.params['id'] as string },
      include: { species: true },
    })
    if (!monster || monster.userId !== user.id) {
      res.status(404).json({ error: 'Monster not found' })
      return
    }

    res.json(toMonsterResponse(monster))
  } catch {
    res.status(500).json({ error: 'Failed to fetch monster' })
  }
})

// DELETE /api/monsters/:id - 몬스터 방출
monsterRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const monster = await prisma.monster.findUnique({
      where: { id: req.params['id'] as string },
    })
    if (!monster || monster.userId !== user.id) {
      res.status(404).json({ error: 'Monster not found' })
      return
    }

    await prisma.$transaction(async (tx) => {
      // 장비 해제
      await tx.equipment.updateMany({
        where: { monsterId: monster.id },
        data: { monsterId: null },
      })

      // 파티에서 제거
      const party = await tx.party.findUnique({ where: { userId: user.id } })
      if (party) {
        const updates: Record<string, null> = {}
        if (party.slot1Id === monster.id) updates['slot1Id'] = null
        if (party.slot2Id === monster.id) updates['slot2Id'] = null
        if (party.slot3Id === monster.id) updates['slot3Id'] = null
        if (Object.keys(updates).length > 0) {
          await tx.party.update({ where: { id: party.id }, data: updates })
        }
      }

      await tx.monster.delete({ where: { id: monster.id } })
    })

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to release monster' })
  }
})

// GET /api/monsters/:id/evolution-paths - 진화 가능 경로
monsterRouter.get('/:id/evolution-paths', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const monster = await prisma.monster.findUnique({
      where: { id: req.params['id'] as string },
    })
    if (!monster || monster.userId !== user.id) {
      res.status(404).json({ error: 'Monster not found' })
      return
    }
    if (!monster.speciesId) {
      res.json([])
      return
    }

    const paths = await prisma.evolutionPath.findMany({
      where: { fromSpeciesId: monster.speciesId },
      include: { toSpecies: true },
    })

    res.json(paths.map((p) => ({
      id: p.id,
      toSpeciesId: p.toSpeciesId,
      toSpeciesName: p.toSpecies.name,
      toRarity: p.toSpecies.rarity,
      toElement: p.toSpecies.element,
      goldCost: p.goldCost,
      minGrowthStage: p.minGrowthStage,
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch evolution paths' })
  }
})

// POST /api/monsters/:id/evolve - 진화 실행
monsterRouter.post('/:id/evolve', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { evolutionPathId } = req.body as { evolutionPathId: string }
    if (!evolutionPathId) {
      res.status(400).json({ error: 'evolutionPathId required' })
      return
    }

    const result = await executeEvolution(user.id, req.params['id'] as string, evolutionPathId)
    res.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(400).json({ error: msg })
  }
})

