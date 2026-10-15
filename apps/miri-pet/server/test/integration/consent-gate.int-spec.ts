import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, devLogin, REQUIRED_CONSENTS, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('서버측 동의 게이트 ConsentGuard (실DB)', () => {
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

  it('필수 동의 전에는 GET /users/:id·/blocks·/reports가 403 { code: CONSENT_REQUIRED }', async () => {
    const me = await devLogin(app, '동의전')
    const other = await devLogin(app, '상대방')

    const responses = await Promise.all([
      http()
        .get(`/api/v1/users/${other.userId}`)
        .set(...bearer(me.accessToken)),
      http()
        .get('/api/v1/blocks')
        .set(...bearer(me.accessToken)),
      http()
        .post(`/api/v1/blocks/${other.userId}`)
        .set(...bearer(me.accessToken)),
      http()
        .delete(`/api/v1/blocks/${other.userId}`)
        .set(...bearer(me.accessToken)),
      http()
        .post('/api/v1/reports')
        .set(...bearer(me.accessToken))
        .send({ targetType: 'USER', targetId: other.userId, reason: 'SPAM' }),
    ])
    responses.forEach((res) => {
      expect(res.status).toBe(403)
      expect(res.body).toMatchObject({ statusCode: 403, code: 'CONSENT_REQUIRED' })
    })
    expect(await prisma.block.count()).toBe(0)
    expect(await prisma.report.count()).toBe(0)
  })

  it('동의 전에도 GET/PATCH /me, POST /me/consents는 열려 있고, 동의 후에는 다른 라우트도 열린다', async () => {
    const me = await devLogin(app, '동의중')
    const other = await devLogin(app, '상대방')

    await http()
      .get('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(200)
    await http()
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ bio: '안녕' })
      .expect(200)
    await http()
      .get(`/api/v1/users/${other.userId}`)
      .set(...bearer(me.accessToken))
      .expect(403)

    await http()
      .post('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .send({ isAge14OrOlder: true, consents: REQUIRED_CONSENTS })
      .expect(204)

    await http()
      .get(`/api/v1/users/${other.userId}`)
      .set(...bearer(me.accessToken))
      .expect(200)
  })

  it('동의 전에도 탈퇴(DELETE /me)는 할 수 있다', async () => {
    const me = await devLogin(app, '바로탈퇴')
    await http()
      .delete('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(204)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: me.userId } })).status).toBe('DELETED')
  })

  it('필수 동의를 철회하면 다시 403', async () => {
    const me = await devLogin(app, '철회자')
    const other = await devLogin(app, '상대방')
    await http()
      .post('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .send({ isAge14OrOlder: true, consents: REQUIRED_CONSENTS })
      .expect(204)
    await prisma.consent.updateMany({
      where: { userId: me.userId, kind: 'PRIVACY' },
      data: { withdrawnAt: new Date() },
    })

    const res = await http()
      .get(`/api/v1/users/${other.userId}`)
      .set(...bearer(me.accessToken))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('CONSENT_REQUIRED')
  })
})
