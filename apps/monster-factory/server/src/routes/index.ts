import type { Express } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { authRouter } from './auth.js'
import { monsterRouter } from './monster.js'
import { energyRouter } from './energy.js'
import { minigameRouter } from './minigame.js'
import { dungeonRouter } from './dungeon.js'
import { inventoryRouter } from './inventory.js'
import { userRouter } from './user.js'
import { summonRouter } from './summon.js'
import { codexRouter } from './codex.js'
import { partyRouter } from './party.js'
import { stageRouter } from './stage.js'

export const registerRoutes = (app: Express) => {
  app.use('/api/auth', authMiddleware, authRouter)
  app.use('/api/monsters', authMiddleware, monsterRouter)
  app.use('/api/energy', authMiddleware, energyRouter)
  app.use('/api/minigame', authMiddleware, minigameRouter)
  app.use('/api/dungeon', authMiddleware, dungeonRouter)
  app.use('/api/inventory', authMiddleware, inventoryRouter)
  app.use('/api/users', authMiddleware, userRouter)
  app.use('/api/summon', authMiddleware, summonRouter)
  app.use('/api/codex', authMiddleware, codexRouter)
  app.use('/api/party', authMiddleware, partyRouter)
  app.use('/api/stages', authMiddleware, stageRouter)
}
