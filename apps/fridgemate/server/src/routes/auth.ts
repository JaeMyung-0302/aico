import crypto from 'node:crypto'
import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { sendPushToUser } from '../services/push-notification.js'

const SALT_ROUNDS = 10
const JWT_EXPIRES_IN = '7d'

const signToken = (
  userId: string,
  groupId: string | null,
  email: string,
): string =>
  jwt.sign({ userId, groupId, email }, process.env.JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
  })

const GROUP_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // 30자, 혼동 문자(0/O/1/I/L) 제외
const GROUP_CODE_LENGTH = 6

const generateGroupCode = (): string => {
  const charLen = GROUP_CODE_CHARS.length
  const maxValid = 256 - (256 % charLen)
  const result: string[] = []
  while (result.length < GROUP_CODE_LENGTH) {
    const byte = crypto.randomBytes(1)[0] as number
    if (byte < maxValid) {
      result.push(GROUP_CODE_CHARS[byte % charLen] as string)
    }
  }
  return result.join('')
}

const authRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 시도입니다. 1분 후 다시 시도해주세요' },
})

const joinRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 시도입니다. 1분 후 다시 시도해주세요' },
})

export const authRouter: RouterType = Router()

// GET /api/auth/me — 현재 사용자 정보 + 관리자 여부
authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Authorization token required' })
    return
  }

  let payload: { userId: string; groupId: string | null; email: string }
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, groupId: true },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    let isAdmin = false
    let groupName: string | null = null
    let groupCode: string | null = null
    if (user.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: user.groupId },
        select: { creatorId: true, name: true, code: true },
      })
      isAdmin = group?.creatorId === user.id
      groupName = group?.name ?? null
      if (isAdmin) groupCode = group?.code ?? null
    }

    res.json({ user, isAdmin, groupName, groupCode })
  } catch {
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

// POST /api/auth/register
authRouter.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body as {
      email?: string
      password?: string
      name?: string
    }

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      const hashed = await bcrypt.hash(password, SALT_ROUNDS)
      const user = await prisma.user.create({
        data: { email, password: hashed, name },
      })

      const token = signToken(user.id, null, user.email)
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          groupId: null,
        },
      })
    } catch {
      res.status(500).json({ error: 'Registration failed' })
    }
  },
)

// POST /api/auth/login
authRouter.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as {
      email?: string
      password?: string
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      const token = signToken(user.id, user.groupId, user.email)
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          groupId: user.groupId,
        },
      })
    } catch {
      res.status(500).json({ error: 'Login failed' })
    }
  },
)

// POST /api/auth/group/join
authRouter.post(
  '/group/join',
  joinRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization?.replace('Bearer ', '')
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization token required' })
      return
    }

    const { code } = req.body as { code?: string }
    if (!code) {
      res.status(400).json({ error: 'Group code is required' })
      return
    }

    let payload: { userId: string; email: string }
    try {
      payload = jwt.verify(authHeader, process.env.JWT_SECRET!) as {
        userId: string
        email: string
      }
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: payload.userId },
      })
      if (existingUser?.groupId) {
        res.status(409).json({ error: '이미 그룹에 속해 있습니다' })
        return
      }

      const group = await prisma.group.findUnique({
        where: { code: code.trim().toUpperCase() },
      })
      if (!group) {
        res.status(404).json({ error: 'Group not found' })
        return
      }

      // 이미 대기 중인 요청이 있는지 확인
      const existingRequest = await prisma.joinRequest.findUnique({
        where: {
          userId_groupId: { userId: payload.userId, groupId: group.id },
        },
      })
      if (existingRequest?.status === 'PENDING') {
        res.status(409).json({ error: '이미 참여 요청이 대기 중입니다' })
        return
      }

      // JoinRequest 생성 (기존 거부된 요청이 있으면 업데이트)
      const joinRequest = await prisma.joinRequest.upsert({
        where: {
          userId_groupId: { userId: payload.userId, groupId: group.id },
        },
        create: { userId: payload.userId, groupId: group.id },
        update: { status: 'PENDING' },
      })

      // 관리자에게 Push 알림
      try {
        await sendPushToUser(group.creatorId, {
          title: '그룹 참여 요청',
          body: `${existingUser?.name ?? '사용자'}님이 "${group.name}" 그룹 참여를 요청했습니다`,
          url: '/settings',
        })
      } catch {
        // Push 실패가 요청 생성을 차단하면 안 됨
      }

      res.status(201).json({
        status: 'PENDING',
        message: '참여 요청이 전송되었습니다. 관리자 승인을 기다려주세요.',
        joinRequestId: joinRequest.id,
      })
    } catch {
      res.status(500).json({ error: 'Failed to request group join' })
    }
  },
)

// POST /api/auth/group/create
authRouter.post(
  '/group/create',
  async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization?.replace('Bearer ', '')
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization token required' })
      return
    }

    const { name } = req.body as { name?: string }
    if (!name) {
      res.status(400).json({ error: 'Group name is required' })
      return
    }

    let payload: { userId: string; email: string }
    try {
      payload = jwt.verify(authHeader, process.env.JWT_SECRET!) as {
        userId: string
        email: string
      }
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: payload.userId },
      })
      if (existingUser?.groupId) {
        res.status(409).json({ error: '이미 그룹에 속해 있습니다' })
        return
      }

      const MAX_RETRIES = 5
      let code = ''
      for (let i = 0; i < MAX_RETRIES; i++) {
        code = generateGroupCode()
        const existing = await prisma.group.findUnique({ where: { code } })
        if (!existing) break
        if (i === MAX_RETRIES - 1) {
          res.status(500).json({
            error: '그룹 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요',
          })
          return
        }
      }

      const group = await prisma.group.create({
        data: { code, name, creatorId: payload.userId },
      })

      const user = await prisma.user.update({
        where: { id: payload.userId },
        data: { groupId: group.id },
      })

      const token = signToken(user.id, group.id, user.email)
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          groupId: group.id,
        },
        group: { id: group.id, name: group.name, code: group.code },
      })
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'P2002'
      ) {
        res
          .status(409)
          .json({ error: '그룹 코드 충돌이 발생했습니다. 다시 시도해주세요' })
        return
      }
      res.status(500).json({ error: 'Failed to create group' })
    }
  },
)
