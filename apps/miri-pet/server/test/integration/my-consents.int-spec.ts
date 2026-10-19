import type { INestApplication } from '@nestjs/common'
import { CURRENT_CONSENT_VERSION } from '@miri-pet/shared'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, devLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('설정 > 동의 내역 관리 GET /me/consents · PATCH /me/consents/:kind (실DB)', () => {
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

  it('kind별 현재 상태를 돌려준다(동의하지 않은 MARKETING은 빠진다)', async () => {
    const me = await consentedLogin(app, '동의목록')
    const res = await http()
      .get('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .expect(200)
    expect(res.body.map((row: { kind: string }) => row.kind)).toEqual(['TERMS', 'PRIVACY', 'LOCATION', 'CERTIFICATE'])
    expect(res.body[0]).toEqual({
      kind: 'TERMS',
      version: '2026-10-01',
      agreedAt: expect.any(String),
      withdrawnAt: null,
    })
  })

  it('LOCATION 철회 → withdrawnAt 기록, 다시 동의 → 현재 버전 새 행', async () => {
    const me = await consentedLogin(app, '위치철회')

    const withdrawn = await http()
      .patch('/api/v1/me/consents/LOCATION')
      .set(...bearer(me.accessToken))
      .send({ agreed: false })
      .expect(200)
    expect(withdrawn.body.find((row: { kind: string }) => row.kind === 'LOCATION').withdrawnAt).toEqual(
      expect.any(String),
    )

    const agreed = await http()
      .patch('/api/v1/me/consents/LOCATION')
      .set(...bearer(me.accessToken))
      .send({ agreed: true })
      .expect(200)
    expect(agreed.body.find((row: { kind: string }) => row.kind === 'LOCATION')).toMatchObject({
      version: CURRENT_CONSENT_VERSION,
      withdrawnAt: null,
    })
    expect(await prisma.consent.count({ where: { userId: me.userId, kind: 'LOCATION' } })).toBe(2)

    // 이미 동의 중이면 멱등
    await http()
      .patch('/api/v1/me/consents/LOCATION')
      .set(...bearer(me.accessToken))
      .send({ agreed: true })
      .expect(200)
    expect(await prisma.consent.count({ where: { userId: me.userId, kind: 'LOCATION' } })).toBe(2)
  })

  it('MARKETING은 처음 동의하면 목록에 생긴다', async () => {
    const me = await consentedLogin(app, '마케팅')
    const res = await http()
      .patch('/api/v1/me/consents/MARKETING')
      .set(...bearer(me.accessToken))
      .send({ agreed: true })
      .expect(200)
    expect(res.body.find((row: { kind: string }) => row.kind === 'MARKETING')).toMatchObject({ withdrawnAt: null })
  })

  it('필수 동의는 400 CONSENT_REQUIRED_KIND, CERTIFICATE·알 수 없는 kind·잘못된 body도 400 — 그대로 남는다', async () => {
    const me = await consentedLogin(app, '필수철회')
    const terms = await http()
      .patch('/api/v1/me/consents/TERMS')
      .set(...bearer(me.accessToken))
      .send({ agreed: false })
    expect(terms.status).toBe(400)
    expect(terms.body.code).toBe('CONSENT_REQUIRED_KIND')

    await http()
      .patch('/api/v1/me/consents/CERTIFICATE')
      .set(...bearer(me.accessToken))
      .send({ agreed: false })
      .expect(400)
    await http()
      .patch('/api/v1/me/consents/UNKNOWN')
      .set(...bearer(me.accessToken))
      .send({ agreed: false })
      .expect(400)
    await http()
      .patch('/api/v1/me/consents/LOCATION')
      .set(...bearer(me.accessToken))
      .send({ agreed: 'no' })
      .expect(400)

    expect(await prisma.consent.count({ where: { userId: me.userId, withdrawnAt: { not: null } } })).toBe(0)
  })

  it('필수 동의 전에는 403 CONSENT_REQUIRED, 토큰 없으면 401', async () => {
    const me = await devLogin(app, '동의전')
    const res = await http()
      .get('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('CONSENT_REQUIRED')
    await http().get('/api/v1/me/consents').expect(401)
  })

  it('선택 동의 토글은 사용자당 분당 10회로 제한한다(11번째 429)', async () => {
    const me = await consentedLogin(app, '토글제한')
    const toggle = (agreed: boolean) =>
      http().patch('/api/v1/me/consents/MARKETING').set(...bearer(me.accessToken)).send({ agreed })
    for (let i = 0; i < 10; i += 1) {
      await toggle(i % 2 === 0).expect(200)
    }
    await toggle(true).expect(429)
  })

  it('QA1 P3: POST /me/consents에 현재가 아닌 TERMS·PRIVACY·CERTIFICATE 버전은 400 CONSENT_VERSION_MISMATCH', async () => {
    const me = await devLogin(app, '옛버전')
    for (const kind of ['TERMS', 'PRIVACY', 'CERTIFICATE'] as const) {
      const consents = ['TERMS', 'PRIVACY', 'CERTIFICATE'].map((k) => ({
        kind: k,
        version: k === kind ? 'v999' : CURRENT_CONSENT_VERSION,
      }))
      const res = await http()
        .post('/api/v1/me/consents')
        .set(...bearer(me.accessToken))
        .send({ isAge14OrOlder: true, consents })
        .expect(400)
      expect(res.body.code).toBe('CONSENT_VERSION_MISMATCH')
    }
    expect(await prisma.consent.count({ where: { userId: me.userId } })).toBe(0)
  })
})
