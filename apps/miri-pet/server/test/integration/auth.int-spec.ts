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

const FOUR_CONSENTS = [
  { kind: 'TERMS', version: '2026-10-01' },
  { kind: 'PRIVACY', version: '2026-10-01' },
  { kind: 'LOCATION', version: '2026-10-01' },
  { kind: 'CERTIFICATE', version: '2026-10-01' },
]

describe('/auth/dev 노출 조건 (실DB)', () => {
  const cases: Array<[string, Record<string, string | undefined>]> = [
    ['ENABLE_DEV_LOGIN 미설정', { ENABLE_DEV_LOGIN: undefined, NODE_ENV: 'test' }],
    ['production + ENABLE_DEV_LOGIN=true', { ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'production' }],
  ]

  it.each(cases)('%s → 404', async (_label, env) => {
    const restore = withEnv(env)
    const app = await createTestApp()
    try {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/dev').send({ nickname: '테스터' })
      expect(res.status).toBe(404)
    } finally {
      await app.close()
      restore()
    }
  })
})

describe('인증·동의 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let kit: TestIdTokenKit
  let restoreEnv: () => void

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', KAKAO_NATIVE_APP_KEY: KAKAO_APP_KEY })
    kit = await createTestIdTokenKit()
    // 외부(카카오 JWKS)만 로컬 키로 교체 → 네트워크 호출 없음
    app = await createTestApp((builder) => builder.overrideProvider(JWKS_RESOLVER).useValue(() => kit.jwks))
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const kakaoLogin = async (sub: string) => {
    const idToken = await kit.sign({ iss: KAKAO_ISSUER, aud: KAKAO_APP_KEY, sub })
    return request(app.getHttpServer()).post('/api/v1/auth/kakao').send({ idToken, deviceLabel: 'iPhone 15' })
  }

  it('카카오 id_token으로 첫 로그인하면 가입(isNewUser=true), 두 번째는 같은 User', async () => {
    const first = await kakaoLogin('kakao-777')
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ isNewUser: true, accessTokenExpiresIn: 900 })

    const second = await kakaoLogin('kakao-777')
    expect(second.body.isNewUser).toBe(false)
    expect(await prisma.user.count()).toBe(1)
    expect(await prisma.authAccount.count({ where: { provider: 'KAKAO', providerSub: 'kakao-777' } })).toBe(1)
  })

  it('aud가 다른 카카오 토큰은 401', async () => {
    const idToken = await kit.sign({ iss: KAKAO_ISSUER, aud: 'someone-else', sub: '1' })
    const res = await request(app.getHttpServer()).post('/api/v1/auth/kakao').send({ idToken })
    expect(res.status).toBe(401)
  })

  it('refresh 원문은 저장하지 않고 SHA-256 해시만 저장한다', async () => {
    const { body } = await kakaoLogin('kakao-1')
    const session = await prisma.session.findFirstOrThrow()
    expect(session.refreshTokenHash).toBe(hashRefreshToken(body.refreshToken))
    expect(session.deviceLabel).toBe('iPhone 15')
  })

  it('refresh 회전 후 유예(10초)가 지나 이전 refresh를 재사용하면 401 + 그 사용자의 세션 전부 폐기', async () => {
    const { body: login } = await kakaoLogin('kakao-2')
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.refreshToken })
    expect(rotated.status).toBe(200)
    expect(rotated.body.refreshToken).not.toBe(login.refreshToken)
    // 회전 시각을 유예 시간 밖으로 돌린다
    await prisma.session.update({
      where: { refreshTokenHash: hashRefreshToken(login.refreshToken) },
      data: { revokedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1_000) },
    })

    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.refreshToken })
    expect(reused.status).toBe(401)
    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(0)

    const afterReuse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
    expect(afterReuse.status).toBe(401)
  })

  it('동시 refresh: 회전 직후(10초 이내) 이전 refresh가 다시 오면 401이지만 새 세션은 살아 있다', async () => {
    const { body: login } = await kakaoLogin('kakao-concurrent')
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.refreshToken })
    expect(rotated.status).toBe(200)

    const late = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.refreshToken })
    expect(late.status).toBe(401)
    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(1)

    const next = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
    expect(next.status).toBe(200)
  })

  it('동시에 같은 refresh로 두 번 회전해도 하나만 성공하고 승자의 세션은 유지된다', async () => {
    const { body: login } = await kakaoLogin('kakao-race')
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: login.refreshToken }),
      request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: login.refreshToken }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 401])
    const winner = a.status === 200 ? a : b
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(...bearer(winner.body.accessToken))
      .expect(200)
    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(1)
  })

  it('ADMIN 계정은 /auth/dev로 로그인할 수 없다(비활성 라우트와 같은 404)', async () => {
    await prisma.user.create({ data: { nickname: '운영자', role: 'ADMIN' } })
    const res = await request(app.getHttpServer()).post('/api/v1/auth/dev').send({ nickname: '운영자' })
    expect(res.status).toBe(404)
    expect(await prisma.session.count()).toBe(0)
  })

  it('logout 후 그 refresh는 401', async () => {
    const { body } = await kakaoLogin('kakao-3')
    await request(app.getHttpServer()).post('/api/v1/auth/logout').send({ refreshToken: body.refreshToken }).expect(204)
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: body.refreshToken })
    expect(res.status).toBe(401)
  })

  it('토큰 없이 /me는 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401)
  })

  it('만 14세 미만이면 422이고 Consent가 저장되지 않는다', async () => {
    const me = await devLogin(app, '어린이')
    const res = await request(app.getHttpServer())
      .post('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .send({ isAge14OrOlder: false, consents: FOUR_CONSENTS })
    expect(res.status).toBe(422)
    expect(await prisma.consent.count()).toBe(0)
  })

  it('동의 4종을 저장하면 Consent 4행이 생기고 /me의 hasRequiredConsents가 true가 된다', async () => {
    const me = await devLogin(app, '보리맘')
    const before = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(...bearer(me.accessToken))
    expect(before.body.hasRequiredConsents).toBe(false)

    await request(app.getHttpServer())
      .post('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .send({ isAge14OrOlder: true, consents: FOUR_CONSENTS })
      .expect(204)

    const rows = await prisma.consent.findMany({ where: { userId: me.userId }, orderBy: { kind: 'asc' } })
    expect(rows.map((row) => row.kind).sort()).toEqual(['CERTIFICATE', 'LOCATION', 'PRIVACY', 'TERMS'])
    expect(rows.every((row) => row.version === '2026-10-01')).toBe(true)
    const after = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(...bearer(me.accessToken))
    expect(after.body.hasRequiredConsents).toBe(true)
  })

  it('PATCH /me: 닉네임은 대소문자 무시 유니크(409), 알림 토글은 저장', async () => {
    await devLogin(app, 'Bori')
    const me = await devLogin(app, '콩이네')
    const conflict = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ nickname: 'bori' })
    expect(conflict.status).toBe(409)

    const ok = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ nickname: '콩이아빠', notifySocial: false })
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ nickname: '콩이아빠', notifySocial: false, notifyDm: true })
  })
})
