import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { JWKS_RESOLVER, KAKAO_ISSUER } from '../../src/auth/id-token-verifier'
import { hashRefreshToken, REFRESH_REUSE_GRACE_MS } from '../../src/auth/session.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { createTestIdTokenKit, type TestIdTokenKit } from '../helpers/id-token-test-keys'
import { bearer, devLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const KAKAO_APP_KEY = 'int-test-kakao-key'

describe('/auth/dev-login 노출 조건 (실DB)', () => {
  const cases: Array<[string, Record<string, string | undefined>]> = [
    ['ENABLE_DEV_LOGIN 미설정', { ENABLE_DEV_LOGIN: undefined, NODE_ENV: 'test' }],
    ['ENABLE_DEV_LOGIN=false', { ENABLE_DEV_LOGIN: 'false', NODE_ENV: 'test' }],
    ['production + ENABLE_DEV_LOGIN=true', { ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'production' }],
  ]

  it.each(cases)('%s → 404이고 사용자를 만들지 않는다', async (_label, env) => {
    const restore = withEnv(env)
    const app = await createTestApp()
    try {
      const prisma = app.get(PrismaService)
      await truncateAll(prisma)
      const res = await request(app.getHttpServer()).post('/api/v1/auth/dev-login').send({ devKey: 'tester' })
      expect(res.status).toBe(404)
      expect(await prisma.user.count()).toBe(0)
    } finally {
      await app.close()
      restore()
    }
  })
})

// 외부(카카오 JWKS)만 로컬 키로 교체 → 네트워크 호출 없음
const startApp = async (kit: TestIdTokenKit): Promise<INestApplication> =>
  createTestApp((builder) => builder.overrideProvider(JWKS_RESOLVER).useValue(() => kit.jwks))

// 인증 라우트는 IP당 분당 10회라 describe마다 앱(throttle 저장소)을 새로 띄운다
describe('인증 (실DB)', () => {
  let kit: TestIdTokenKit
  let restoreEnv: () => void

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', KAKAO_NATIVE_APP_KEY: KAKAO_APP_KEY })
    kit = await createTestIdTokenKit()
  })

  afterAll(() => {
    restoreEnv()
  })

  const kakaoLogin = async (app: INestApplication, sub: string) => {
    const idToken = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub })
    return request(app.getHttpServer()).post('/api/v1/auth/kakao').send({ idToken, deviceLabel: 'iPhone 15' })
  }

  describe('POST /auth/:provider', () => {
    let app: INestApplication
    let prisma: PrismaService

    beforeAll(async () => {
      app = await startApp(kit)
      prisma = app.get(PrismaService)
    })

    beforeEach(async () => {
      await truncateAll(prisma)
    })

    afterAll(async () => {
      await app.close()
    })

    it('첫 로그인은 User + AuthAccount(KAKAO, sub)를 만들고, 같은 sub로 다시 로그인하면 같은 userId', async () => {
      const first = await kakaoLogin(app, 'kakao-777')
      expect(first.status).toBe(200)
      expect(first.body).toMatchObject({ isNewUser: true, accessTokenExpiresIn: 900 })
      const account = await prisma.authAccount.findUniqueOrThrow({
        where: { provider_providerSub: { provider: 'KAKAO', providerSub: 'kakao-777' } },
      })

      const second = await kakaoLogin(app, 'kakao-777')
      expect(second.body.isNewUser).toBe(false)
      const me = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(...bearer(second.body.accessToken))
        .expect(200)
      expect(me.body.id).toBe(account.userId)
      expect(await prisma.user.count()).toBe(1)
    })

    it('카카오 프로필을 받지 않는다: 신규 사용자 displayName은 null', async () => {
      const { body } = await kakaoLogin(app, 'kakao-new')
      const me = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(...bearer(body.accessToken))
      expect(me.body).toMatchObject({ displayName: null, couple: null })
    })

    it('잘못된 토큰은 401이고 사용자를 만들지 않는다', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/kakao').send({ idToken: 'x' })
      expect(res.status).toBe(401)
      expect(await prisma.user.count()).toBe(0)
    })

    it('aud가 다른 카카오 토큰은 401', async () => {
      const idToken = await kit.sign({ iss: KAKAO_ISSUER, aud: 'someone-else', sub: '1' })
      const res = await request(app.getHttpServer()).post('/api/v1/auth/kakao').send({ idToken })
      expect(res.status).toBe(401)
    })

    it('지원하지 않는 제공자(apple)는 400', async () => {
      const idToken = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub: '1' })
      const res = await request(app.getHttpServer()).post('/api/v1/auth/apple').send({ idToken })
      expect(res.status).toBe(400)
      expect(await prisma.user.count()).toBe(0)
    })

    it('refresh 원문은 저장하지 않고 SHA-256 해시만 저장한다', async () => {
      const { body } = await kakaoLogin(app, 'kakao-1')
      const session = await prisma.session.findFirstOrThrow()
      expect(session.refreshTokenHash).toBe(hashRefreshToken(body.refreshToken))
      expect(session.deviceLabel).toBe('iPhone 15')
    })
  })

  describe('POST /auth/refresh · /auth/logout', () => {
    let app: INestApplication
    let prisma: PrismaService

    beforeAll(async () => {
      app = await startApp(kit)
      prisma = app.get(PrismaService)
    })

    beforeEach(async () => {
      await truncateAll(prisma)
    })

    afterAll(async () => {
      await app.close()
    })

    const refresh = (refreshToken: string) =>
      request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken })

    it('회전 후 유예(10초)가 지나 이전 refresh를 재사용하면 401 + 그 사용자의 세션 전부 폐기', async () => {
      const login = await devLogin(app, 'reuse')
      const rotated = await refresh(login.refreshToken)
      expect(rotated.status).toBe(200)
      expect(rotated.body).toMatchObject({ isNewUser: false })
      expect(rotated.body.refreshToken).not.toBe(login.refreshToken)
      // 회전 시각을 유예 시간 밖으로 돌린다
      await prisma.session.update({
        where: { refreshTokenHash: hashRefreshToken(login.refreshToken) },
        data: { rotatedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1_000) },
      })

      expect((await refresh(login.refreshToken)).status).toBe(401)
      expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(0)
      expect((await refresh(rotated.body.refreshToken)).status).toBe(401)
    })

    it('동시 refresh: 회전 직후(10초 이내) 이전 refresh가 다시 오면 401이지만 새 세션은 살아 있다', async () => {
      const login = await devLogin(app, 'concurrent')
      const rotated = await refresh(login.refreshToken)
      expect(rotated.status).toBe(200)

      expect((await refresh(login.refreshToken)).status).toBe(401)
      expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(1)
      expect((await refresh(rotated.body.refreshToken)).status).toBe(200)
    })

    it('동시에 같은 refresh로 두 번 회전해도 하나만 성공하고 승자의 세션은 유지된다', async () => {
      const login = await devLogin(app, 'race')
      const [a, b] = await Promise.all([refresh(login.refreshToken), refresh(login.refreshToken)])
      expect([a.status, b.status].sort()).toEqual([200, 401])
      const winner = a.status === 200 ? a : b
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .set(...bearer(winner.body.accessToken))
        .expect(200)
      expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(1)
    })

    it('logout은 그 세션을 폐기하고, 이후 그 refresh는 401', async () => {
      const login = await devLogin(app, 'logout')
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: login.refreshToken })
        .expect(204)
      const session = await prisma.session.findUniqueOrThrow({
        where: { refreshTokenHash: hashRefreshToken(login.refreshToken) },
      })
      expect(session.revokedAt).not.toBeNull()
      expect((await refresh(login.refreshToken)).status).toBe(401)
    })
  })

  describe('POST /auth/dev-login', () => {
    let app: INestApplication
    let prisma: PrismaService

    beforeAll(async () => {
      app = await startApp(kit)
      prisma = app.get(PrismaService)
      await truncateAll(prisma)
    })

    afterAll(async () => {
      await app.close()
    })

    it('같은 devKey면 같은 사용자, 다른 devKey면 다른 사용자', async () => {
      const a1 = await devLogin(app, 'alice')
      const a2 = await devLogin(app, 'alice')
      const b = await devLogin(app, 'bob')
      expect(a1.userId).toBe(a2.userId)
      expect(b.userId).not.toBe(a1.userId)
      expect(a1.isNewUser).toBe(true)
      expect(a2.isNewUser).toBe(false)
    })

    it('devKey 형식이 아니면 400', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/dev-login').send({ devKey: 'Not Valid!' }).expect(400)
    })
  })
})

describe('/me (실DB)', () => {
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

  it('토큰 없이 /me는 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401)
  })

  it('GET /me: 동의 전 상태와 couple null', async () => {
    const me = await devLogin(app, 'me-get')
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(200)
    expect(res.body).toEqual({
      id: me.userId,
      displayName: null,
      consents: { terms: false, privacy: false, location: false },
      couple: null,
    })
  })

  it.each([
    ['빈 문자열', ''],
    ['공백·제로폭 문자만', ' ​ '],
    ['21자', '가'.repeat(21)],
  ])('PATCH /me: displayName %s는 400', async (_label, displayName) => {
    const me = await devLogin(app, 'me-bad')
    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ displayName })
      .expect(400)
  })

  it('PATCH /me: 1~20자 displayName은 앞뒤 공백을 잘라 저장한다', async () => {
    const me = await devLogin(app, 'me-ok')
    const twenty = '가'.repeat(20)
    const res = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ displayName: ` ${twenty} ` })
      .expect(200)
    expect(res.body.displayName).toBe(twenty)
    const one = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ displayName: '별' })
      .expect(200)
    expect(one.body.displayName).toBe('별')
  })

  it('PUT /me/consents: 필수 동의(TERMS·PRIVACY)를 false로 보내면 400이고 저장하지 않는다', async () => {
    const me = await devLogin(app, 'consent-bad')
    await request(app.getHttpServer())
      .put('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .send({ terms: true, privacy: false, location: true })
      .expect(400)
    expect(await prisma.consent.count()).toBe(0)
  })

  it('PUT /me/consents: 위치는 선택. 켜면 행이 생기고 끄면 철회 기록이 남는다', async () => {
    const me = await devLogin(app, 'consent-ok')
    const put = (location: boolean) =>
      request(app.getHttpServer())
        .put('/api/v1/me/consents')
        .set(...bearer(me.accessToken))
        .send({ terms: true, privacy: true, location })

    expect((await put(false)).body).toEqual({ terms: true, privacy: true, location: false })
    expect((await put(true)).body).toEqual({ terms: true, privacy: true, location: true })
    expect((await put(false)).body).toEqual({ terms: true, privacy: true, location: false })

    const rows = await prisma.consent.findMany({ where: { userId: me.userId } })
    expect(rows.map((row) => row.kind).sort()).toEqual(['LOCATION', 'PRIVACY', 'TERMS'])
    expect(rows.find((row) => row.kind === 'LOCATION')?.withdrawnAt).not.toBeNull()
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(...bearer(me.accessToken))
    expect(res.body.consents).toEqual({ terms: true, privacy: true, location: false })
  })
})
