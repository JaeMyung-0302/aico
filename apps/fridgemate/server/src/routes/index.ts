import { Express } from 'express'
import rateLimit from 'express-rate-limit'
import { jwtAuth, jwtAuthOptionalGroup } from '../middleware/auth.js'
import { authRouter } from './auth.js'
import { joinRequestRouter } from './join-request.js'
import { fridgeRouter } from './fridge.js'
import { foodItemRouter } from './food-item.js'
import { alertRouter } from './alert.js'
import { pushRouter } from './push.js'
import { recipeSuggestRouter } from './recipe-suggest.js'
import { cookCompleteRouter } from './cook-complete.js'
import { usageRouter } from './usage.js'
import { paymentRouter, paymentWebhookRouter } from './payment.js'

const joinRequestRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 요청입니다. 1분 후 다시 시도해주세요' },
})

const paymentRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많은 결제 요청입니다. 1분 후 다시 시도해주세요' },
})

export const registerRoutes = (app: Express): void => {
  // 인증 (미들웨어 불필요)
  app.use('/api/auth', authRouter)

  // Push 알림 (vapid-public-key는 공개, subscribe/unsubscribe는 jwtAuth)
  app.use('/api/push', pushRouter)

  // 참여 요청 (pending/approve/reject는 jwtAuth, my-status는 jwtAuthOptionalGroup)
  app.use(
    '/api/join-requests',
    joinRequestRateLimiter,
    jwtAuthOptionalGroup,
    joinRequestRouter,
  )

  // 결제 웹훅 (인증 불필요)
  app.use('/api/payments', paymentWebhookRouter)

  // 결제 (subscribe/cancel/status는 jwtAuth + rate limit)
  app.use('/api/payments', paymentRateLimiter, jwtAuth, paymentRouter)

  // 인증 필요 라우트
  app.use('/api/usage', jwtAuth, usageRouter)
  app.use('/api/fridges', jwtAuth, recipeSuggestRouter)
  app.use('/api/fridges', jwtAuth, cookCompleteRouter)
  app.use('/api/fridges', jwtAuth, fridgeRouter)
  app.use('/api', jwtAuth, foodItemRouter)
  app.use('/api/alerts', jwtAuth, alertRouter)
}
