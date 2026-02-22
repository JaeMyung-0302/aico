import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'
import { registerRoomEvents } from './events/room-events.js'
import { registerGameEvents } from './events/game-events.js'
import { ConnectionTracker, RateLimiter } from './guards/rate-limiter.js'

const CLIENT_ORIGIN = process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5174'
const corsOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim())

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

// Per-IP connection limiting
const connectionTracker = new ConnectionTracker()

io.use((socket, next) => {
  const ip = socket.handshake.address
  if (!connectionTracker.isAllowed(ip)) {
    return next(new Error('Too many connections from this IP'))
  }
  connectionTracker.increment(ip)
  socket.on('disconnect', () => {
    connectionTracker.decrement(ip)
  })
  next()
})

// Per-socket event rate limiting
const rateLimiter = new RateLimiter()

io.on('connection', (socket) => {
  socket.use((_event, next) => {
    if (!rateLimiter.isAllowed(socket.id)) {
      console.warn(`Rate limit exceeded: ${socket.id}`)
      socket.disconnect(true)
      return
    }
    next()
  })

  socket.on('disconnect', () => {
    rateLimiter.remove(socket.id)
  })
})

app.use(cors({ origin: corsOrigins }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'wasd-server' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

registerRoomEvents(io)
registerGameEvents(io)

const PORT = process.env['PORT'] ?? 4002

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  httpServer.close(() => process.exit(0))
})

httpServer.listen(PORT, () => {
  console.log(`WASD server running on port ${PORT}`)
})
