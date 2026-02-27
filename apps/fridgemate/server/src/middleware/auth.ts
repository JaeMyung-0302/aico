import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId: string
  groupId: string
  userEmail: string
}

export interface AuthRequestOptionalGroup extends Request {
  userId: string
  groupId: string | null
  userEmail: string
}

interface JwtPayload {
  userId: string
  groupId: string | null
  email: string
}

export const jwtAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

    if (!payload.groupId) {
      res.status(403).json({ error: 'Group membership required' })
      return
    }

    ;(req as AuthRequest).userId = payload.userId
    ;(req as AuthRequest).groupId = payload.groupId
    ;(req as AuthRequest).userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// groupId 없어도 통과하는 미들웨어 (JoinRequest 라우트용)
export const jwtAuthOptionalGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

    ;(req as AuthRequestOptionalGroup).userId = payload.userId
    ;(req as AuthRequestOptionalGroup).groupId = payload.groupId
    ;(req as AuthRequestOptionalGroup).userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
