import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from './auth.js'

export const groupAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId, groupId } = req as AuthRequest

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    })

    if (!group || group.creatorId !== userId) {
      res.status(403).json({ error: '그룹 관리자 권한이 필요합니다' })
      return
    }

    next()
  } catch {
    res.status(500).json({ error: 'Failed to verify group admin' })
  }
}
