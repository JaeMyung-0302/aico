import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'

export const authRouter: RouterType = Router()

// POST /api/auth/verify — 그룹코드 검증
authRouter.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body as { code?: string }

  if (!code) {
    res.status(400).json({ error: 'Group code is required' })
    return
  }

  try {
    const group = await prisma.group.findUnique({
      where: { code: code.trim().toLowerCase() },
    })

    if (!group) {
      res.status(401).json({ error: 'Invalid group code' })
      return
    }

    res.json({ id: group.id, name: group.name })
  } catch {
    res.status(500).json({ error: 'Verification failed' })
  }
})
