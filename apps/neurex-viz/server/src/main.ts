import path from 'node:path'
import os from 'node:os'
import express from 'express'
import cors from 'cors'
import { scanAgents } from './lib/agent-scanner.js'
import { SKILL_DEFINITIONS } from '@neurex-viz/shared'
import { createAgentsRouter } from './routes/agents.js'
import { createEventsRouter } from './routes/events.js'
import { createSessionsRouter } from './routes/sessions.js'
import { createFileWatcher } from './watchers/file-watcher.js'

const PORT = 4006
const AGENTS_DIR =
  process.env.AGENTS_DIR || '/Users/ijaemyeong/Desktop/neurex/.claude/agents'
const OBSERVATIONS_PATH =
  process.env.OBSERVATIONS_PATH ||
  path.join(os.homedir(), '.claude/homunculus/observations.jsonl')

const PROJECT_ROOTS = [
  '/Users/ijaemyeong/Desktop/aico',
  '/Users/ijaemyeong/Desktop/neurex',
  '/Users/ijaemyeong/Desktop/prix-workspace',
]

const DEVELOP_STATE_PATHS = PROJECT_ROOTS.map((root) =>
  path.join(root, '.claude/outputs/develop-state.json'),
)

const app = express()
app.use(cors({ origin: 'http://localhost:5181' }))

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'neurex-viz-server' })
})
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'neurex-viz-server' })
})

// Scan agents
const agents = scanAgents(AGENTS_DIR)
console.log(`[neurex-viz] Scanned ${agents.length} agents from ${AGENTS_DIR}`)

// Routes
app.use('/api/agents', createAgentsRouter(agents))
app.get('/api/skills', (_req, res) => { res.json(SKILL_DEFINITIONS) })
const { router: eventsRouter, broadcast } = createEventsRouter()
app.use('/api/events', eventsRouter)
const { router: sessionsRouter, trackEvent } = createSessionsRouter()
app.use('/api/sessions', sessionsRouter)

// File watchers
const watcher = createFileWatcher({
  observationsPath: OBSERVATIONS_PATH,
  developStatePaths: DEVELOP_STATE_PATHS,
  onEvent: (event) => {
    console.log(`[event] ${event.type}: ${event.agent} [${event.project ?? '?'}] (${event.tool ?? 'n/a'})`)
    trackEvent(event)
    broadcast(event)
  },
})

const server = app.listen(PORT, () => {
  console.log(`[neurex-viz] Server running on http://localhost:${PORT}`)
  console.log(`[neurex-viz] Watching observations: ${OBSERVATIONS_PATH}`)
  for (const p of DEVELOP_STATE_PATHS) console.log(`[neurex-viz] Watching state: ${p}`)
})

const shutdown = () => {
  console.log('[neurex-viz] Shutting down...')
  watcher.close()
  server.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
