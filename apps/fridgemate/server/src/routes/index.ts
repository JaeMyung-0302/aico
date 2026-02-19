import { Express } from 'express'
import { groupAuth } from '../middleware/group-auth.js'
import { authRouter } from './auth.js'
import { fridgeRouter } from './fridge.js'
import { foodItemRouter } from './food-item.js'
import { alertRouter } from './alert.js'
import { pushRouter } from './push.js'
import { recipeSuggestRouter } from './recipe-suggest.js'
import { cookCompleteRouter } from './cook-complete.js'

export const registerRoutes = (app: Express): void => {
  // 인증 (미들웨어 불필요)
  app.use('/api/auth', authRouter)

  // Push 알림 (vapid-public-key는 공개, subscribe/unsubscribe는 라우트별 groupAuth)
  app.use('/api/push', pushRouter)

  // 인증 필요 라우트
  app.use('/api/fridges', groupAuth, recipeSuggestRouter)
  app.use('/api/fridges', groupAuth, cookCompleteRouter)
  app.use('/api/fridges', groupAuth, fridgeRouter)
  app.use('/api', groupAuth, foodItemRouter)
  app.use('/api/alerts', groupAuth, alertRouter)
}
