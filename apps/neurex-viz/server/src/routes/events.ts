import { Router } from 'express'
import type { Response } from 'express'
import type { SSEEvent } from '@neurex-viz/shared'

export const createEventsRouter = (): { router: Router; broadcast: (event: SSEEvent) => void } => {
  const router = Router()
  const clients = new Set<Response>()

  router.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    clients.add(res)

    const heartbeat = setInterval(() => {
      res.write(':\n\n')
    }, 30000)

    res.on('close', () => {
      clearInterval(heartbeat)
      clients.delete(res)
    })
  })

  const broadcast = (event: SSEEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const client of clients) {
      client.write(data)
    }
  }

  return { router, broadcast }
}
