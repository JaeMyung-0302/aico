import { Router } from 'express'
import type { AgentMeta } from '@neurex-viz/shared'

export const createAgentsRouter = (agents: AgentMeta[]): Router => {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json(agents)
  })

  return router
}
