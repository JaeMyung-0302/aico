import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import { prisma } from '../lib/prisma.js'
import { jwtAuth, type AuthRequest } from '../middleware/auth.js'
import { getVapidPublicKey } from '../services/push-notification.js'
import type { PushSubscriptionInput } from '../types/index.js'

export const pushRouter: RouterType = Router()

// GET /api/push/vapid-public-key (공개)
pushRouter.get('/vapid-public-key', (_req: Request, res: Response): void => {
  res.json({ publicKey: getVapidPublicKey() })
})

// POST /api/push/subscribe — Push 구독 등록 (인증 필요)
pushRouter.post('/subscribe', jwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { groupId, userId } = req as AuthRequest
  const { endpoint, keys } = req.body as PushSubscriptionInput

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid subscription data' })
    return
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        groupId,
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        groupId,
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    res.status(201).json({ success: true })
  } catch {
    res.status(500).json({ error: 'Subscription failed' })
  }
})

// POST /api/push/unsubscribe — Push 구독 해제 (인증 필요)
pushRouter.post('/unsubscribe', jwtAuth, async (req: Request, res: Response): Promise<void> => {
  const { endpoint } = req.body as { endpoint?: string }

  if (!endpoint) {
    res.status(400).json({ error: 'Endpoint required' })
    return
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    })

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Unsubscription failed' })
  }
})
