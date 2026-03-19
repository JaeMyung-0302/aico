import { readFileSync, writeFile, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RankingEntry } from '@wasd/shared'
import { MAX_RANKING_SIZE } from '@wasd/shared'
import { logger } from '../lib/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
const DATA_FILE = resolve(DATA_DIR, 'rankings.json')

const loadRankings = (): RankingEntry[] => {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_RANKING_SIZE)
    return []
  } catch {
    return []
  }
}

const saveRankings = (data: RankingEntry[]): void => {
  writeFile(DATA_FILE, JSON.stringify(data, null, 2), (err) => {
    if (err) logger.error('Failed to save rankings:', err)
  })
}

mkdirSync(DATA_DIR, { recursive: true })

let rankings: RankingEntry[] = loadRankings()

const compare = (a: RankingEntry, b: RankingEntry): number => {
  if (a.elapsedTime !== b.elapsedTime) return a.elapsedTime - b.elapsedTime
  if (a.deaths !== b.deaths) return a.deaths - b.deaths
  return a.clearedAt - b.clearedAt
}

const findInsertIndex = (list: RankingEntry[], entry: RankingEntry): number => {
  let low = 0
  let high = list.length

  while (low < high) {
    const mid = (low + high) >>> 1
    const existing = list[mid]
    if (existing && compare(existing, entry) <= 0) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}

export const rankingStore = {
  addEntry: (entry: RankingEntry): number | null => {
    const index = findInsertIndex(rankings, entry)

    if (index >= MAX_RANKING_SIZE) return null

    rankings = [
      ...rankings.slice(0, index),
      entry,
      ...rankings.slice(index),
    ].slice(0, MAX_RANKING_SIZE)

    saveRankings(rankings)

    return index + 1 // 1-based rank
  },

  getRankings: (): RankingEntry[] => [...rankings],
}
