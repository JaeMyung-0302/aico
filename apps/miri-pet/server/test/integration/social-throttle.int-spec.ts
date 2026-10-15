import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'
import { PrismaService } from '../../src/prisma/prisma.service'

const ANY_POST = '0199e3a0-0000-7000-8000-000000000999'

// Phase 4 보안 리뷰 MEDIUM(b): 사용자 단위 쓰기 제한. 가드는 요청 검증(pipe)보다 먼저 세므로 400 요청도 집계된다
describe('사용자 단위 rate limit: 게시·댓글·팔로우 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let ipSeq = 0

  beforeAll(async () => {
    // 전역 IP 제한(120/분)과 섞이지 않게 테스트마다 다른 클라이언트 IP로 보낸다
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', TRUST_PROXY_HOPS: '2' })
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  type Send = (token: string, ip: string) => request.Test

  // limit번은 핸들러까지 가고(expected), limit+1번째는 429. 다른 사용자는 같은 IP여도 별도 버킷
  const expectUserLimit = async (send: Send, limit: number, expected: number) => {
    ipSeq += 1
    const ip = `203.0.113.${ipSeq}`
    const first = await consentedLogin(app, `첫째${ipSeq}`)
    const second = await consentedLogin(app, `둘째${ipSeq}`)
    const statuses: number[] = []
    for (let n = 0; n < limit; n += 1) statuses.push((await send(first.accessToken, ip)).status)
    expect(statuses.every((status) => status === expected)).toBe(true)
    expect((await send(first.accessToken, ip)).status).toBe(429)
    expect((await send(second.accessToken, ip)).status).toBe(expected)
  }

  it('POST /posts 10회/분', async () => {
    const send: Send = (token, ip) =>
      request(app.getHttpServer())
        .post('/api/v1/posts')
        .set(...bearer(token))
        .set('cf-connecting-ip', ip)
        .send({})
    await expectUserLimit(send, 10, 400)
  })

  it('POST /posts/:id/comments 30회/분', async () => {
    const send: Send = (token, ip) =>
      request(app.getHttpServer())
        .post(`/api/v1/posts/${ANY_POST}/comments`)
        .set(...bearer(token))
        .set('cf-connecting-ip', ip)
        .send({})
    await expectUserLimit(send, 30, 400)
  })

  it('PUT /users/:id/follow 30회/분', async () => {
    const send: Send = (token, ip) =>
      request(app.getHttpServer())
        .put(`/api/v1/users/${ANY_POST}/follow`)
        .set(...bearer(token))
        .set('cf-connecting-ip', ip)
    await expectUserLimit(send, 30, 404)
  })
})
