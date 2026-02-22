import { Router, Request, Response } from 'express'
import type { Router as RouterType } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import { groupAdmin } from '../middleware/group-admin.js'
import * as paymentService from '../services/payment.js'

export const paymentRouter: RouterType = Router()
export const paymentWebhookRouter: RouterType = Router()

// POST /api/payments/subscribe — 빌링키로 구독 시작 (관리자만)
paymentRouter.post('/subscribe', groupAdmin, async (req: Request, res: Response): Promise<void> => {
  const { userId, groupId } = req as unknown as AuthRequest
  const { billingKey } = req.body ?? {}

  if (!billingKey || typeof billingKey !== 'string' || billingKey.length > 200) {
    res.status(400).json({ error: '유효한 billingKey가 필요합니다' })
    return
  }

  try {
    const result = await paymentService.subscribe(groupId, userId, billingKey)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '구독 실패'
    const status = message.includes('이미 활성') ? 409 : message.includes('설정되지') ? 503 : 500
    res.status(status).json({ error: message })
  }
})

// POST /api/payments/cancel — 구독 해지 (관리자만)
paymentRouter.post('/cancel', groupAdmin, async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req as unknown as AuthRequest

  try {
    const result = await paymentService.cancelSubscription(groupId)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '해지 실패'
    const status = message.includes('활성 구독이 없') ? 404 : 500
    res.status(status).json({ error: message })
  }
})

// GET /api/payments/status — 구독 상태 조회 (멤버도 가능)
paymentRouter.get('/status', async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req as unknown as AuthRequest

  try {
    const result = await paymentService.getStatus(groupId)
    res.json(result)
  } catch {
    res.status(500).json({ error: '구독 상태 조회 실패' })
  }
})

// POST /api/payments/webhook — PortOne 웹훅 수신 (인증 불필요, 별도 라우터)
paymentWebhookRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    // main.ts의 verify 콜백으로 보존된 원본 body 사용 (서명 검증용)
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    const body = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body)
    const headers = req.headers as Record<string, string>
    const result = await paymentService.handleWebhook(body, headers)
    res.json(result)
  } catch {
    res.status(400).json({ error: 'Webhook 처리 실패' })
  }
})
