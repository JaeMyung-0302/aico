import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer, REQUIRED_CONSENTS, tokenFor } from './auth-helpers'
import { createPairedCouple, createUser } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

// 앱 온보딩을 건너뛰고 API를 직접 불러도 필수 동의 없이는 커플 데이터에 닿지 못한다
describe('필수 동의 게이트 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const http = () => request(app.getHttpServer())
  const memberToken = async () => {
    const paired = await createPairedCouple(prisma)
    return { paired, token: await tokenFor(app, paired.members[0].id), userId: paired.members[0].id }
  }

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(new MemoryObjectStorage()),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  it('동의 없는 커플 멤버는 커플 라우트에서 403 + code CONSENT_REQUIRED, 커플은 그대로', async () => {
    const { paired, token } = await memberToken()
    const res = await http()
      .get('/api/v1/couples/me')
      .set(...bearer(token))
      .expect(403)
    expect(res.body).toMatchObject({ statusCode: 403, code: 'CONSENT_REQUIRED', message: expect.any(String) })
    expect(typeof res.body.requestId).toBe('string')

    await http()
      .post('/api/v1/couples/me/unlink')
      .set(...bearer(token))
      .expect(403)
    expect((await prisma.couple.findUniqueOrThrow({ where: { id: paired.couple.id } })).status).toBe('ACTIVE')
  })

  it('약관만 동의했거나 개인정보 동의가 철회돼 있으면 403', async () => {
    const { userId, token } = await memberToken()
    await prisma.consent.createMany({
      data: [
        { userId, kind: 'TERMS', version: 'test' },
        { userId, kind: 'PRIVACY', version: 'test', withdrawnAt: new Date() },
      ],
    })
    const res = await http()
      .get('/api/v1/couples/me')
      .set(...bearer(token))
      .expect(403)
    expect(res.body.code).toBe('CONSENT_REQUIRED')
  })

  it('PUT /me/consents로 동의하면 바로 통과한다', async () => {
    const { token } = await memberToken()
    await http()
      .put('/api/v1/me/consents')
      .set(...bearer(token))
      .send(REQUIRED_CONSENTS)
      .expect(200)
    await http()
      .get('/api/v1/couples/me')
      .set(...bearer(token))
      .expect(200)
  })

  it('동의 전에도 /me·/me/consents·/me/push-tokens·health·초대 발급은 열려 있다', async () => {
    const { token } = await memberToken()
    await http()
      .get('/api/v1/me')
      .set(...bearer(token))
      .expect(200)
    await http()
      .post('/api/v1/me/push-tokens')
      .set(...bearer(token))
      .send({ token: 'ExponentPushToken[gate]', platform: 'ios' })
      .expect(204)
    await http()
      .delete(`/api/v1/me/push-tokens/${encodeURIComponent('ExponentPushToken[gate]')}`)
      .set(...bearer(token))
      .expect(204)
    await http().get('/api/v1/health').expect(200)
    const solo = await createUser(prisma)
    await http()
      .post('/api/v1/couples/invites')
      .set(...bearer(await tokenFor(app, solo.id)))
      .expect(201)
    await http()
      .put('/api/v1/me/consents')
      .set(...bearer(token))
      .send(REQUIRED_CONSENTS)
      .expect(200)
  })
})
