import express from 'express'
import cors from 'cors'
import { registerRoutes } from './routes/index.js'
import { startExpiryCron } from './services/expiry-cron.js'

const CLIENT_ORIGIN = process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5176'
const corsOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, ''))

const app = express()

console.log('CORS allowed origins:', corsOrigins)
app.use(cors({ origin: corsOrigins }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'fridgemate-server' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

registerRoutes(app)

const PORT = process.env['PORT'] ?? 4001

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('SIGTERM', () => {
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`FridgeMate server running on port ${PORT}`)
  startExpiryCron()
})
