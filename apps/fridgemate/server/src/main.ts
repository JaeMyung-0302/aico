import express from 'express'
import cors from 'cors'
import { registerRoutes } from './routes/index.js'
import { startExpiryCron } from './services/expiry-cron.js'
import { logger } from './lib/logger.js'

const CLIENT_ORIGIN = process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5176'
const corsOrigins = CLIENT_ORIGIN.split(',').map((o) =>
  o.trim().replace(/\/+$/, ''),
)

const app = express()

logger.info(`CORS allowed origins: ${corsOrigins.join(', ')}`)
app.use(cors({ origin: corsOrigins }))
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // 웹훅 서명 검증을 위해 원본 body 보존
      if (req.url?.includes('/payments/webhook')) {
        ;(req as express.Request & { rawBody: Buffer }).rawBody = buf
      }
    },
  }),
)

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'fridgemate-server' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

registerRoutes(app)

const PORT = process.env['PORT'] ?? 4001

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason)
})

process.on('SIGTERM', () => {
  process.exit(0)
})

app.listen(PORT, () => {
  logger.info(`FridgeMate server running on port ${PORT}`)
  startExpiryCron()
})
