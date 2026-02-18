import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { toCodexResponse } from '../lib/transform.js'
import type { AuthRequest } from '../middleware/auth.js'

export const codexRouter: IRouter = Router()

// GET /api/codex - 도감 목록 + 완성률
codexRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const allSpecies = await prisma.monsterSpecies.findMany({
      orderBy: [{ element: 'asc' }, { personality: 'asc' }],
    })

    const userCodex = await prisma.codex.findMany({
      where: { userId: user.id },
    })

    const codexMap = new Map(userCodex.map((c) => [c.speciesId, c]))

    const entries = allSpecies.map((species) =>
      toCodexResponse(species, codexMap.get(species.id) ?? null),
    )

    const discovered = userCodex.length
    const total = allSpecies.length

    res.json({
      entries,
      discovered,
      total,
      completionRate: total > 0 ? Math.round((discovered / total) * 100) : 0,
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch codex' })
  }
})

// GET /api/codex/:speciesId - 도감 상세
codexRouter.get('/:speciesId', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const species = await prisma.monsterSpecies.findUnique({
      where: { id: req.params['speciesId'] as string },
    })
    if (!species) {
      res.status(404).json({ error: 'Species not found' })
      return
    }

    const codex = await prisma.codex.findUnique({
      where: { userId_speciesId: { userId: user.id, speciesId: species.id } },
    })

    res.json(toCodexResponse(species, codex))
  } catch {
    res.status(500).json({ error: 'Failed to fetch codex entry' })
  }
})
