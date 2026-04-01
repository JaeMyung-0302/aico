import fs from 'node:fs'
import path from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import type { SSEEvent, RiskLevel } from '@neurex-viz/shared'
import { parseObservationLine } from '../lib/event-parser.js'

interface WatcherConfig {
  observationsPath: string
  developStatePaths: string[]
  onEvent: (event: SSEEvent) => void
}

export const createFileWatcher = (config: WatcherConfig) => {
  let lastSize = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let obsWatcher: FSWatcher | null = null

  const startObservationsWatch = () => {
    try {
      lastSize = fs.statSync(config.observationsPath).size
    } catch {
      lastSize = 0
    }

    console.log(`[watcher] Now watching: ${config.observationsPath}`)

    obsWatcher = watch(config.observationsPath, {
      persistent: true,
      usePolling: true,
      interval: 500,
    })

    obsWatcher.on('change', () => {
      try {
        const stats = fs.statSync(config.observationsPath)
        if (stats.size <= lastSize) {
          lastSize = stats.size
          return
        }

        const fd = fs.openSync(config.observationsPath, 'r')
        const buffer = Buffer.alloc(stats.size - lastSize)
        fs.readSync(fd, buffer, 0, buffer.length, lastSize)
        fs.closeSync(fd)
        lastSize = stats.size

        const newContent = buffer.toString('utf8')
        const lines = newContent.trim().split('\n')

        for (const line of lines) {
          if (!line.trim()) continue
          const event = parseObservationLine(line)
          if (event) {
            config.onEvent(event)
          }
        }
      } catch (err) {
        console.error('[watcher] Error reading observations:', err)
      }
    })
  }

  // Wait for observations file to appear, then start watching
  const waitForFile = () => {
    if (fs.existsSync(config.observationsPath)) {
      startObservationsWatch()
      return
    }

    // Watch the parent directory for file creation
    const parentDir = path.dirname(config.observationsPath)
    const targetName = path.basename(config.observationsPath)

    // Ensure parent directory exists
    fs.mkdirSync(parentDir, { recursive: true })

    console.log(`[watcher] Waiting for ${targetName} in ${parentDir}...`)

    const dirWatcher = watch(parentDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
    })

    dirWatcher.on('add', (filePath) => {
      if (path.basename(filePath) === targetName) {
        console.log(`[watcher] File detected: ${targetName}`)
        dirWatcher.close()
        startObservationsWatch()
      }
    })

    // Fallback poll in case chokidar misses the event
    const poll = () => {
      if (fs.existsSync(config.observationsPath)) {
        if (retryTimer) clearTimeout(retryTimer)
        dirWatcher.close()
        startObservationsWatch()
        return
      }
      retryTimer = setTimeout(poll, 5000)
    }
    retryTimer = setTimeout(poll, 5000)
  }

  // Develop state watchers (one per project)
  const stateWatchers = config.developStatePaths.map((statePath) => {
    const watcher = watch(statePath, {
      persistent: true,
      usePolling: true,
      interval: 1000,
      ignoreInitial: true,
    })

    const projectName = path.basename(path.resolve(statePath, '../../..'))

    watcher.on('change', () => {
      try {
        const content = fs.readFileSync(statePath, 'utf8')
        const state = JSON.parse(content) as {
          currentPhase?: string
          riskTemperature?: RiskLevel
        }

        config.onEvent({
          type: 'phase_change',
          agent: 'system',
          phase: state.currentPhase,
          riskTemperature: state.riskTemperature,
          project: projectName,
          timestamp: new Date().toISOString(),
        })
      } catch {
        // develop-state may not exist yet
      }
    })

    watcher.on('error', () => {
      // file doesn't exist yet, that's ok
    })

    return watcher
  })

  // Start
  waitForFile()

  return {
    close: () => {
      if (retryTimer) clearTimeout(retryTimer)
      obsWatcher?.close()
      for (const w of stateWatchers) w.close()
    },
  }
}
