import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, devLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const TOKEN = 'ExponentPushToken[abc-123]'

describe('/me/push-tokens (실DB)', () => {
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

  it('토큰 없이 등록하면 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/me/push-tokens')
      .send({ token: TOKEN, platform: 'ios' })
      .expect(401)
  })

  it('등록은 멱등이고, 다른 계정이 같은 기기 토큰을 등록하면 소유자를 옮긴다', async () => {
    const a = await devLogin(app, 'push-a')
    const b = await devLogin(app, 'push-b')
    const register = (accessToken: string) =>
      request(app.getHttpServer())
        .post('/api/v1/me/push-tokens')
        .set(...bearer(accessToken))
        .send({ token: TOKEN, platform: 'android' })
        .expect(204)

    await register(a.accessToken)
    await register(a.accessToken)
    expect(await prisma.pushToken.findMany({ select: { userId: true, platform: true } })).toEqual([
      { userId: a.userId, platform: 'ANDROID' },
    ])

    await register(b.accessToken)
    expect((await prisma.pushToken.findUniqueOrThrow({ where: { expoToken: TOKEN } })).userId).toBe(b.userId)
  })

  it('잘못된 platform은 400', async () => {
    const me = await devLogin(app, 'push-bad')
    await request(app.getHttpServer())
      .post('/api/v1/me/push-tokens')
      .set(...bearer(me.accessToken))
      .send({ token: TOKEN, platform: 'web' })
      .expect(400)
  })

  it('DELETE /me/push-tokens/:token은 내 토큰만 지운다', async () => {
    const owner = await devLogin(app, 'push-owner')
    const other = await devLogin(app, 'push-other')
    await request(app.getHttpServer())
      .post('/api/v1/me/push-tokens')
      .set(...bearer(owner.accessToken))
      .send({ token: TOKEN, platform: 'ios' })
      .expect(204)
    const path = `/api/v1/me/push-tokens/${encodeURIComponent(TOKEN)}`

    await request(app.getHttpServer())
      .delete(path)
      .set(...bearer(other.accessToken))
      .expect(204)
    expect(await prisma.pushToken.count()).toBe(1)

    await request(app.getHttpServer())
      .delete(path)
      .set(...bearer(owner.accessToken))
      .expect(204)
    expect(await prisma.pushToken.count()).toBe(0)
  })
})
