import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createUser } from './factories'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('차단·신고 (실DB)', () => {
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

  // 신고 집계 자격: 가입 3일 이상 → 테스트에서는 createdAt을 4일 전으로 돌린다
  const ageAccounts = (userIds: string[]) =>
    prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { createdAt: new Date(Date.now() - 4 * 86_400_000) },
    })

  const reportUser = (token: string, targetId: string) =>
    http()
      .post('/api/v1/reports')
      .set(...bearer(token))
      .send({ targetType: 'USER', targetId, reason: 'SPAM' })

  const loginReporters = async () => {
    const reporters = await Promise.all(['신고1', '신고2', '신고3'].map((n) => consentedLogin(app, n)))
    await ageAccounts(reporters.map((r) => r.userId))
    return reporters
  }

  it('차단 전에는 서로의 프로필이 보인다', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const res = await http()
      .get(`/api/v1/users/${b.userId}`)
      .set(...bearer(a.accessToken))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: b.userId, nickname: '비이', followerCount: 0, isFollowing: false })
  })

  it('A가 B를 차단하면 A→B, B→A 모두 GET /users/:id 404', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)

    const aSeesB = await http()
      .get(`/api/v1/users/${b.userId}`)
      .set(...bearer(a.accessToken))
    const bSeesA = await http()
      .get(`/api/v1/users/${a.userId}`)
      .set(...bearer(b.accessToken))
    expect(aSeesB.status).toBe(404)
    expect(bSeesA.status).toBe(404)
  })

  it('차단은 멱등이고 GET /blocks에 나오며, 해제하면 다시 보인다', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)

    const list = await http()
      .get('/api/v1/blocks')
      .set(...bearer(a.accessToken))
      .expect(200)
    expect(list.body).toEqual({ items: [{ id: b.userId, nickname: '비이', avatarUrl: null }] })

    await http()
      .delete(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    await http()
      .get(`/api/v1/users/${a.userId}`)
      .set(...bearer(b.accessToken))
      .expect(200)
  })

  it('자기 자신 차단 400, 없는 사용자 404, uuid가 아니면 400', async () => {
    const a = await consentedLogin(app, '에이')
    await http()
      .post(`/api/v1/blocks/${a.userId}`)
      .set(...bearer(a.accessToken))
      .expect(400)
    await http()
      .post('/api/v1/blocks/0199e3a0-0000-7000-8000-000000000999')
      .set(...bearer(a.accessToken))
      .expect(404)
    await http()
      .post('/api/v1/blocks/not-a-uuid')
      .set(...bearer(a.accessToken))
      .expect(400)
  })

  it('사용자 신고: 같은 신고자 2회 409, 자격 있는 서로 다른 3명이면 hiddenAt 설정 → 프로필 404', async () => {
    const target = await consentedLogin(app, '스팸러')
    const [r1, r2, r3] = await loginReporters()
    if (!r1 || !r2 || !r3) throw new Error('신고자 로그인 실패')
    const report = (token: string) =>
      http()
        .post('/api/v1/reports')
        .set(...bearer(token))
        .send({ targetType: 'USER', targetId: target.userId, reason: 'SPAM' })

    expect((await report(r1.accessToken)).status).toBe(201)
    expect((await report(r1.accessToken)).status).toBe(409)
    expect((await report(r2.accessToken)).status).toBe(201)
    // 2명까지는 노출 유지
    await http()
      .get(`/api/v1/users/${target.userId}`)
      .set(...bearer(r3.accessToken))
      .expect(200)

    expect((await report(r3.accessToken)).status).toBe(201)
    const hidden = await prisma.user.findUniqueOrThrow({ where: { id: target.userId } })
    expect(hidden.hiddenAt).not.toBeNull()
    await http()
      .get(`/api/v1/users/${target.userId}`)
      .set(...bearer(r1.accessToken))
      .expect(404)
    // 본인에게는 계속 보인다
    await http()
      .get(`/api/v1/users/${target.userId}`)
      .set(...bearer(target.accessToken))
      .expect(200)
  })

  it('신고 남용 방지: 가입 3일 미만 신고자 3명은 자동 숨김을 일으키지 않는다', async () => {
    const target = await consentedLogin(app, '피해자')
    const fresh = await Promise.all(['새계정1', '새계정2', '새계정3'].map((n) => consentedLogin(app, n)))
    for (const reporter of fresh) expect((await reportUser(reporter.accessToken, target.userId)).status).toBe(201)

    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.userId } })).hiddenAt).toBeNull()
    expect(await prisma.report.count({ where: { targetId: target.userId, status: 'PENDING' } })).toBe(3)
  })

  it('신고 남용 방지: 정지된 신고자·연령 미확인 신고자의 신고는 집계하지 않는다', async () => {
    const target = await consentedLogin(app, '피해자')
    const [r1, r2, r3] = await loginReporters()
    if (!r1 || !r2 || !r3) throw new Error('신고자 로그인 실패')
    expect((await reportUser(r1.accessToken, target.userId)).status).toBe(201)
    expect((await reportUser(r2.accessToken, target.userId)).status).toBe(201)
    await prisma.user.update({ where: { id: r1.userId }, data: { status: 'SUSPENDED' } })
    await prisma.user.update({ where: { id: r2.userId }, data: { birthYearVerifiedAt: null } })

    expect((await reportUser(r3.accessToken, target.userId)).status).toBe(201)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.userId } })).hiddenAt).toBeNull()
  })

  it('ADMIN 계정은 신고가 누적돼도 자동 숨김되지 않는다', async () => {
    const admin = await createUser(prisma, { role: 'ADMIN' })
    const reporters = await loginReporters()
    for (const reporter of reporters) expect((await reportUser(reporter.accessToken, admin.id)).status).toBe(201)

    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).hiddenAt).toBeNull()
  })

  it('사용자 열거 방지: 없음·정지·탈퇴·숨김 사용자에 대한 차단/신고는 모두 /users/:id와 같은 404', async () => {
    const me = await consentedLogin(app, '탐색자')
    const suspended = await createUser(prisma, { status: 'SUSPENDED' })
    const deleted = await createUser(prisma, { status: 'DELETED' })
    const hidden = await createUser(prisma)
    await prisma.user.update({ where: { id: hidden.id }, data: { hiddenAt: new Date() } })
    const missing = '0199e3a0-0000-7000-8000-000000000999'
    const strip = (body: Record<string, unknown>) => ({ ...body, requestId: undefined })

    const profile404 = strip(
      (
        await http()
          .get(`/api/v1/users/${missing}`)
          .set(...bearer(me.accessToken))
          .expect(404)
      ).body,
    )
    for (const id of [missing, suspended.id, deleted.id, hidden.id]) {
      const block = await http()
        .post(`/api/v1/blocks/${id}`)
        .set(...bearer(me.accessToken))
      expect(block.status).toBe(404)
      expect(strip(block.body)).toEqual(profile404)
      const report = await reportUser(me.accessToken, id)
      expect(report.status).toBe(404)
      expect(strip(report.body)).toEqual(profile404)
    }
    expect(await prisma.block.count()).toBe(0)
    expect(await prisma.report.count()).toBe(0)
  })

  // MESSAGE 핸들러는 Phase 5에서 등록됨 → 없는 메시지는 404 (모든 대상 유형에 핸들러가 있다)
  it('없는 메시지 신고는 404, 자기 신고는 400', async () => {
    const a = await consentedLogin(app, '에이')
    const message = await http()
      .post('/api/v1/reports')
      .set(...bearer(a.accessToken))
      .send({ targetType: 'MESSAGE', targetId: a.userId, reason: 'SPAM' })
    expect(message.status).toBe(404)
    const self = await http()
      .post('/api/v1/reports')
      .set(...bearer(a.accessToken))
      .send({ targetType: 'USER', targetId: a.userId, reason: 'ETC' })
    expect(self.status).toBe(400)
  })
})
