import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'

export interface GroupRequest extends Request {
  groupId: string
}

export const groupAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const groupId = req.headers['x-group-id'] as string | undefined

  if (!groupId) {
    res.status(401).json({ error: 'X-Group-Id header is required' })
    return
  }

  try {
    const group = await prisma.group.findUnique({ where: { id: groupId } })

    if (!group) {
      res.status(401).json({ error: 'Invalid group ID' })
      return
    }

    ;(req as GroupRequest).groupId = groupId
    next()
  } catch {
    res.status(500).json({ error: 'Authentication failed' })
  }
}
