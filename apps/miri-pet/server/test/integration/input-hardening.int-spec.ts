import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { seedPosts } from './social-helpers'
import { truncateAll } from './truncate'

// QA1: 입력 경계(NUL 바이트·큰 body)가 500 대신 4xx 앱 에러 모양으로 응답한다
describe('입력 경계 하드닝 (실DB, QA1)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
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

  const http = () => request(app.getHttpServer())

  describe('P2: NUL(\\u0000)이 든 문자열은 400 Validation failed', () => {
    it('댓글 본문', async () => {
      const me = await consentedLogin(app, '널댓글')
      const [postId] = await seedPosts(prisma, me.userId, 1)
      const res = await http()
        .post(`/api/v1/posts/${postId}/comments`)
        .set(...bearer(me.accessToken))
        .send({ body: '안녕\u0000하세요' })
        .expect(400)
      expect(res.body).toMatchObject({ message: 'Validation failed', issues: [{ path: 'body' }] })
      expect(typeof res.body.requestId).toBe('string')
      expect(await prisma.comment.count()).toBe(0)
    })

    it('프로필 소개(bio)', async () => {
      const me = await consentedLogin(app, '널소개')
      await http()
        .patch('/api/v1/me')
        .set(...bearer(me.accessToken))
        .send({ bio: 'hi\u0000' })
        .expect(400)
    })

    it('GET /users?nickname=a%00', async () => {
      const me = await consentedLogin(app, '널검색')
      const res = await http()
        .get('/api/v1/users?nickname=a%00')
        .set(...bearer(me.accessToken))
        .expect(400)
      expect(res.body).toMatchObject({ in: 'query', issues: [{ path: 'nickname' }] })
    })
  })

  it('P3: 공백·제로폭 문자만 있는 댓글은 400', async () => {
    const me = await consentedLogin(app, '빈댓글')
    const [postId] = await seedPosts(prisma, me.userId, 1)
    await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(...bearer(me.accessToken))
      .send({ body: ' \u200B\u200D \uFEFF\u2060 ' })
      .expect(400)
    expect(await prisma.comment.count()).toBe(0)
  })

  it('P3: 100KB를 넘는 JSON body는 413 PAYLOAD_TOO_LARGE', async () => {
    const me = await consentedLogin(app, '큰본문')
    const res = await http()
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ bio: 'a'.repeat(200 * 1024) }))
      .expect(413)
    expect(res.body).toMatchObject({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE' })
    expect(typeof res.body.requestId).toBe('string')
  })

  it('P3: 깨진 JSON body는 400 (500 아님)', async () => {
    const me = await consentedLogin(app, '깨진본문')
    await http()
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .set('Content-Type', 'application/json')
      .send('{"bio":')
      .expect(400)
  })
})
