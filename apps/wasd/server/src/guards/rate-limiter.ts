import { randomInt } from 'node:crypto'
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_EVENTS,
  MAX_CONNECTIONS_PER_IP,
  INVITE_CODE_LENGTH,
} from '@wasd/shared'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CONTROL_CHARS = /[\x00-\x1F\x7F\u200B-\u200F\u202A-\u202E\uFEFF]/g

// --- Rate Limiter ---

export class RateLimiter {
  private timestamps = new Map<string, number[]>()
  private readonly windowMs: number
  private readonly maxEvents: number

  constructor(
    windowMs = RATE_LIMIT_WINDOW_MS,
    maxEvents = RATE_LIMIT_MAX_EVENTS,
  ) {
    this.windowMs = windowMs
    this.maxEvents = maxEvents
  }

  isAllowed(id: string): boolean {
    const now = Date.now()
    const entries = this.timestamps.get(id) ?? []
    const filtered = entries.filter((t) => now - t < this.windowMs)

    if (filtered.length === 0 && entries.length > 0) {
      this.timestamps.delete(id)
    }

    if (filtered.length >= this.maxEvents) {
      this.timestamps.set(id, filtered)
      return false
    }

    filtered.push(now)
    this.timestamps.set(id, filtered)
    return true
  }

  remove(id: string): void {
    this.timestamps.delete(id)
  }
}

// --- Connection Tracker ---

export class ConnectionTracker {
  private counts = new Map<string, number>()
  private readonly maxPerIp: number

  constructor(maxPerIp = MAX_CONNECTIONS_PER_IP) {
    this.maxPerIp = maxPerIp
  }

  isAllowed(ip: string): boolean {
    const count = this.counts.get(ip) ?? 0
    return count < this.maxPerIp
  }

  increment(ip: string): void {
    const count = this.counts.get(ip) ?? 0
    this.counts.set(ip, count + 1)
  }

  decrement(ip: string): void {
    const count = this.counts.get(ip) ?? 1
    if (count <= 1) {
      this.counts.delete(ip)
    } else {
      this.counts.set(ip, count - 1)
    }
  }
}

// --- Nickname Sanitization ---

export const sanitizeNickname = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null
  const cleaned = raw
    .replace(CONTROL_CHARS, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length < 1 || cleaned.length > 10) return null
  return cleaned
}

// --- Secure Room Code ---

export const generateSecureCode = (existingCodes: {
  has: (code: string) => boolean
}): string => {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += CHARS[randomInt(CHARS.length)]
    }
    if (!existingCodes.has(code)) return code
  }
  throw new Error('Failed to generate unique room code')
}
