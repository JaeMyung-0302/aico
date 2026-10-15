import { DM_SOCKET_ERRORS } from '@miri-pet/shared'
import {
  DEFAULT_DM_SOCKET_LIMITS,
  HandshakeRateLimiter,
  handshakeClientIp,
  hasSocketCapacity,
  tokenExpiryDelayMs,
} from './socket-limits'

const WINDOW_MS = 60_000

describe('DM 소켓 handshake 제한(보안 리뷰 LOW-2)', () => {
  it('기본값: 사용자당 소켓 5개, IP당 handshake 1분 30회', () => {
    expect(DEFAULT_DM_SOCKET_LIMITS).toEqual({ maxSocketsPerUser: 5, handshakesPerIp: 30, handshakeWindowMs: 60_000 })
  })

  it('소켓 에러 코드(connect_error message)', () => {
    expect(DM_SOCKET_ERRORS).toEqual({
      unauthorized: 'UNAUTHORIZED',
      tooManyConnections: 'TOO_MANY_CONNECTIONS',
      rateLimited: 'RATE_LIMITED',
    })
  })

  it('사용자 소켓 수가 상한 미만일 때만 새 연결을 받는다', () => {
    expect(hasSocketCapacity(0, 5)).toBe(true)
    expect(hasSocketCapacity(4, 5)).toBe(true)
    expect(hasSocketCapacity(5, 5)).toBe(false)
  })

  describe('HandshakeRateLimiter', () => {
    const setup = (limit = 3) => {
      let now = 1_000_000
      const limiter = new HandshakeRateLimiter(limit, WINDOW_MS, () => now)
      return { limiter, advance: (ms: number) => (now += ms) }
    }

    it('IP별로 창 안에서 limit번까지 허용하고 다음은 거부한다', () => {
      const { limiter } = setup()
      expect([1, 2, 3].map(() => limiter.tryAcquire('203.0.113.1'))).toEqual([true, true, true])
      expect(limiter.tryAcquire('203.0.113.1')).toBe(false)
      expect(limiter.tryAcquire('203.0.113.2')).toBe(true)
    })

    it('창이 지나면 다시 허용한다', () => {
      const { limiter, advance } = setup(1)
      expect(limiter.tryAcquire('203.0.113.1')).toBe(true)
      expect(limiter.tryAcquire('203.0.113.1')).toBe(false)
      advance(WINDOW_MS)
      expect(limiter.tryAcquire('203.0.113.1')).toBe(true)
    })

    it('지난 창의 IP 기록은 정리돼 메모리가 쌓이지 않는다', () => {
      const { limiter, advance } = setup(1)
      limiter.tryAcquire('203.0.113.1')
      limiter.tryAcquire('203.0.113.2')
      expect(limiter.trackedCount()).toBe(2)
      advance(WINDOW_MS)
      limiter.tryAcquire('203.0.113.3')
      expect(limiter.trackedCount()).toBe(1)
    })
  })

  describe('handshakeClientIp: REST rate limit과 같은 IP 판정', () => {
    const handshake = { address: '10.0.0.5', headers: { 'cf-connecting-ip': '198.51.100.7' } }

    it('프록시 뒤(hops > 0)면 cf-connecting-ip', () => {
      expect(handshakeClientIp(handshake, 2)).toBe('198.51.100.7')
    })

    it('프록시 없이(0)는 위조 가능한 헤더를 무시하고 소켓 주소', () => {
      expect(handshakeClientIp(handshake, 0)).toBe('10.0.0.5')
    })
  })

  describe('tokenExpiryDelayMs: access token 만료 시각에 소켓을 끊는다', () => {
    it('exp(초)까지 남은 ms', () => {
      expect(tokenExpiryDelayMs(1_000, 900_000)).toBe(100_000)
    })

    it('이미 지났으면 0', () => {
      expect(tokenExpiryDelayMs(1_000, 1_000_500)).toBe(0)
    })

    it('setTimeout 상한(2^31-1ms)을 넘지 않는다', () => {
      expect(tokenExpiryDelayMs(Number.MAX_SAFE_INTEGER / 1000, 0)).toBe(2 ** 31 - 1)
    })
  })
})
