import type { ExecutionContext } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { ThrottlerException, ThrottlerStorageService } from '@nestjs/throttler'
import { USER_THROTTLE_KEY, type UserThrottleOptions, UserThrottleGuard } from './user-throttle.guard'

const OPTIONS: UserThrottleOptions = { name: 'media-uploads', limit: 2, ttl: 60_000 }

class Handlers {
  limited(): void {}
  open(): void {}
}
Reflect.defineMetadata(USER_THROTTLE_KEY, OPTIONS, Handlers.prototype.limited)

type FakeRequest = { authUser?: { id: string }; ip?: string; headers: Record<string, string> }

const contextFor = (req: FakeRequest, handler: () => void): ExecutionContext =>
  new ExecutionContextHost([req, {}, jest.fn()], Handlers, handler)

describe('UserThrottleGuard (사용자 id 기준 rate limit)', () => {
  let storage: ThrottlerStorageService
  let guard: UserThrottleGuard

  beforeEach(() => {
    storage = new ThrottlerStorageService()
    guard = new UserThrottleGuard(new Reflector(), storage, new ConfigService({ trustProxyHops: 0 }))
  })

  afterEach(() => {
    storage.onApplicationShutdown()
  })

  const hit = (req: FakeRequest, handler: () => void = Handlers.prototype.limited) =>
    guard.canActivate(contextFor(req, handler))

  it('같은 사용자가 limit을 넘기면 429(ThrottlerException)', async () => {
    const req = { authUser: { id: 'user-a' }, ip: '10.0.0.1', headers: {} }
    await expect(hit(req)).resolves.toBe(true)
    await expect(hit(req)).resolves.toBe(true)
    await expect(hit(req)).rejects.toBeInstanceOf(ThrottlerException)
  })

  it('같은 IP라도 사용자가 다르면 별도 버킷', async () => {
    const a = { authUser: { id: 'user-a' }, ip: '10.0.0.1', headers: {} }
    const b = { authUser: { id: 'user-b' }, ip: '10.0.0.1', headers: {} }
    await hit(a)
    await hit(a)
    await expect(hit(a)).rejects.toBeInstanceOf(ThrottlerException)
    await expect(hit(b)).resolves.toBe(true)
  })

  it('로그인 전 요청은 클라이언트 IP로 센다', async () => {
    const anon = { ip: '10.0.0.9', headers: {} }
    await hit(anon)
    await hit(anon)
    await expect(hit(anon)).rejects.toBeInstanceOf(ThrottlerException)
    await expect(hit({ ip: '10.0.0.10', headers: {} })).resolves.toBe(true)
  })

  it('@UserThrottle 메타데이터가 없는 핸들러는 통과', async () => {
    const req = { authUser: { id: 'user-a' }, headers: {} }
    for (let i = 0; i < 5; i += 1) {
      await expect(hit(req, Handlers.prototype.open)).resolves.toBe(true)
    }
  })
})
