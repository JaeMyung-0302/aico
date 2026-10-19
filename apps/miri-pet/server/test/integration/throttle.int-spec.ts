import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'

const AUTH_LIMIT_PER_MIN = 10

// 잘못된 refresh → 401이지만 rate limit은 핸들러보다 먼저 센다
const refreshFrom = (app: INestApplication, headers: Record<string, string>) =>
  request(app.getHttpServer())
    .post('/api/v1/auth/refresh')
    .set(headers)
    .send({ refreshToken: 'not-a-real-refresh-token' })

const exhaust = async (app: INestApplication, headers: Record<string, string>): Promise<number[]> => {
  const statuses: number[] = []
  for (let i = 0; i < AUTH_LIMIT_PER_MIN; i += 1) {
    statuses.push((await refreshFrom(app, headers)).status)
  }
  return statuses
}

describe('rate limit: 프록시 뒤 클라이언트 IP 식별 + /auth/* 10회/분', () => {
  describe('TRUST_PROXY_HOPS=2 (Cloudflare → Lightsail → Docker)', () => {
    let app: INestApplication
    let restoreEnv: () => void

    beforeAll(async () => {
      restoreEnv = withEnv({ NODE_ENV: 'test', TRUST_PROXY_HOPS: '2' })
      app = await createTestApp()
    })

    afterAll(async () => {
      await app.close()
      restoreEnv()
    })

    it('같은 cf-connecting-ip로 /auth를 11번 부르면 11번째는 429, 다른 cf-connecting-ip는 별도 버킷', async () => {
      const first = { 'cf-connecting-ip': '203.0.113.10' }
      const second = { 'cf-connecting-ip': '203.0.113.20' }

      const statuses = await exhaust(app, first)
      expect(statuses.every((status) => status === 401)).toBe(true)
      const limited = await refreshFrom(app, first)
      expect(limited.status).toBe(429)
      // QA1 P3: 앱 에러 모양(code·한국어 message·requestId)
      expect(limited.body).toMatchObject({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요',
      })
      expect(typeof limited.body.requestId).toBe('string')

      expect((await refreshFrom(app, second)).status).toBe(401)
    })

    it('cf-connecting-ip가 없으면 trust proxy로 계산한 req.ip(X-Forwarded-For)를 쓴다', async () => {
      const a = { 'x-forwarded-for': '198.51.100.1, 172.68.0.1' }
      const b = { 'x-forwarded-for': '198.51.100.2, 172.68.0.1' }
      await exhaust(app, a)
      expect((await refreshFrom(app, a)).status).toBe(429)
      expect((await refreshFrom(app, b)).status).toBe(401)
    })
  })

  describe('TRUST_PROXY_HOPS 미설정(로컬 기본 0)', () => {
    let app: INestApplication
    let restoreEnv: () => void

    beforeAll(async () => {
      restoreEnv = withEnv({ NODE_ENV: 'test', TRUST_PROXY_HOPS: undefined })
      app = await createTestApp()
    })

    afterAll(async () => {
      await app.close()
      restoreEnv()
    })

    it('cf-connecting-ip·X-Forwarded-For를 위조해도 같은 소켓 IP 버킷이라 11번째는 429', async () => {
      const statuses: number[] = []
      for (let i = 0; i <= AUTH_LIMIT_PER_MIN; i += 1) {
        const spoofed = { 'cf-connecting-ip': `203.0.113.${i}`, 'x-forwarded-for': `198.51.100.${i}` }
        statuses.push((await refreshFrom(app, spoofed)).status)
      }
      expect(statuses.slice(0, AUTH_LIMIT_PER_MIN).every((status) => status === 401)).toBe(true)
      expect(statuses[AUTH_LIMIT_PER_MIN]).toBe(429)
    })

    it('/health는 rate limit 대상이 아니다', async () => {
      for (let i = 0; i <= AUTH_LIMIT_PER_MIN; i += 1) {
        await request(app.getHttpServer()).get('/api/v1/health').expect(200)
      }
    })
  })
})
