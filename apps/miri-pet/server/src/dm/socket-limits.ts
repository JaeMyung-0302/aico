import { resolveClientIp } from '../common/throttle/client-ip'

// 보안 리뷰 LOW-2: 사용자당 동시 소켓 상한 + IP당 handshake 횟수(창 단위). 테스트는 DM_SOCKET_LIMITS를 override한다
export type DmSocketLimits = {
  maxSocketsPerUser: number
  handshakesPerIp: number
  handshakeWindowMs: number
}

export const DM_SOCKET_LIMITS = Symbol('DM_SOCKET_LIMITS')

export const DEFAULT_DM_SOCKET_LIMITS: DmSocketLimits = {
  maxSocketsPerUser: 5,
  handshakesPerIp: 30,
  handshakeWindowMs: 60_000,
}

// setTimeout 지연 상한(이보다 크면 즉시 실행된다)
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1

export const hasSocketCapacity = (current: number, max: number): boolean => current < max

// access token exp(초)까지 남은 ms. 지났으면 0
export const tokenExpiryDelayMs = (expSeconds: number, nowMs: number): number =>
  Math.min(Math.max(expSeconds * 1000 - nowMs, 0), MAX_TIMER_DELAY_MS)

export type HandshakeAddress = { address: string; headers: Record<string, string | string[] | undefined> }

// REST rate limit(resolveClientIp)과 같은 판정: 프록시 뒤면 cf-connecting-ip, 아니면 소켓 주소
export const handshakeClientIp = ({ address, headers }: HandshakeAddress, trustProxyHops: number): string =>
  resolveClientIp({ ip: address, headers }, trustProxyHops)

type Bucket = { count: number; resetAt: number }

// 단일 인스턴스(D5) 메모리 고정 창 카운터. 창이 지난 기록은 창마다 한 번 쓸어 낸다
export class HandshakeRateLimiter {
  private buckets: ReadonlyMap<string, Bucket> = new Map()
  private nextSweepAt = 0

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  tryAcquire(key: string): boolean {
    const now = this.clock()
    this.sweep(now)
    const current = this.buckets.get(key)
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + this.windowMs }
    if (bucket.count >= this.limit) return false
    this.buckets = new Map([...this.buckets, [key, { ...bucket, count: bucket.count + 1 }]])
    return true
  }

  trackedCount(): number {
    return this.buckets.size
  }

  private sweep(now: number): void {
    if (now < this.nextSweepAt) return
    this.nextSweepAt = now + this.windowMs
    this.buckets = new Map([...this.buckets].filter(([, bucket]) => bucket.resetAt > now))
  }
}
