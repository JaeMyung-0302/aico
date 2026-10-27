import { Controller, Delete, Get, HttpCode, HttpStatus, type INestApplication, Post } from '@nestjs/common'
import { UNLINK_GRACE_DAYS } from '@you-in-heart/shared'
import request from 'supertest'
import { AllowDuringUnlinking } from '../../src/couples/decorators/allow-during-unlinking.decorator'
import { type CoupleContext, CurrentCouple } from '../../src/couples/decorators/current-couple.decorator'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { KakaoUnlinkClient } from '../../src/users/kakao-unlink.client'
import { bearer, tokenFor } from './auth-helpers'
import { createEntry, createPairedCouple, createUser, grantRequiredConsents, type PairedCouple } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const NOW = new Date('2026-11-01T03:00:00.000Z')
const DAY_MS = 86_400_000

// 커플 라우트의 HTTP 메서드별 동작을 확인하는 테스트 전용 라우트(0E에는 커플 DELETE·export 라우트가 아직 없다)
@Controller('lifecycle-probe')
class LifecycleProbeController {
  @Get()
  read(@CurrentCouple() couple: CoupleContext): { coupleId: string } {
    return { coupleId: couple.id }
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  write(): void {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(): void {}
}

@Controller('export')
class ExportProbeController {
  @Post()
  @AllowDuringUnlinking()
  @HttpCode(HttpStatus.NO_CONTENT)
  start(): void {}
}

type Member = { userId: string; token: string }

describe('연결 해제·재연결·회원 탈퇴 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  const push = createFakePush()
  const kakaoUnlink = { unlink: jest.fn<Promise<void>, [string]>() }

  const http = () => request(app.getHttpServer())
  const pairWithTokens = async (): Promise<{ paired: PairedCouple; first: Member; second: Member }> => {
    const paired = await createPairedCouple(prisma)
    await grantRequiredConsents(
      prisma,
      paired.members.map((member) => member.id),
    )
    const [first, second] = await Promise.all(
      paired.members.map(async (member) => ({ userId: member.id, token: await tokenFor(app, member.id) })),
    )
    if (!first || !second) throw new Error('멤버 토큰 발급 실패')
    return { paired, first, second }
  }
  const unlink = (who: Member) =>
    http()
      .post('/api/v1/couples/me/unlink')
      .set(...bearer(who.token))
  const reconnect = (who: Member) =>
    http()
      .post('/api/v1/couples/me/reconnect')
      .set(...bearer(who.token))

  beforeAll(async () => {
    // Date만 고정한다(타이머·nextTick은 실제 것을 써야 DB·HTTP가 돈다)
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    })
    app = await createTestApp(
      (builder) =>
        builder
          .overrideProvider(PUSH_SENDER)
          .useValue(push.sender)
          .overrideProvider(KakaoUnlinkClient)
          .useValue(kakaoUnlink)
          // 해제·탈퇴가 R2 원장을 쓴다 → 네트워크 없이 메모리 스토리지로
          .overrideProvider(OBJECT_STORAGE)
          .useValue(new MemoryObjectStorage()),
      { controllers: [LifecycleProbeController, ExportProbeController] },
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    push.reset()
    kakaoUnlink.unlink.mockReset()
    kakaoUnlink.unlink.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await app.close()
    jest.useRealTimers()
  })

  describe('POST /couples/me/unlink', () => {
    it('한 명이 요청하면 즉시 UNLINKING, purgeAfter = now + 30일, 상대에게 푸시 1건', async () => {
      const { paired, first, second } = await pairWithTokens()
      await prisma.pushToken.createMany({
        data: [
          { userId: first.userId, expoToken: 'ExponentPushToken[me]', platform: 'IOS' },
          { userId: second.userId, expoToken: 'ExponentPushToken[partner]', platform: 'ANDROID' },
        ],
      })
      const res = await unlink(first).expect(200)

      expect(res.body).toMatchObject({
        status: 'UNLINKING',
        unlinkRequestedBy: first.userId,
        unlinkRequestedAt: NOW.toISOString(),
        purgeAfter: new Date(NOW.getTime() + UNLINK_GRACE_DAYS * DAY_MS).toISOString(),
      })
      const couple = await prisma.couple.findUniqueOrThrow({ where: { id: paired.couple.id } })
      expect(couple.status).toBe('UNLINKING')
      expect(couple.purgeAfter?.toISOString()).toBe('2026-12-01T03:00:00.000Z')
      expect(push.sent().map((message) => message.to)).toEqual(['ExponentPushToken[partner]'])
    })

    it('유예 중 GET은 200, POST·PATCH·DELETE는 409, export는 허용, 다시 unlink도 409', async () => {
      const { first, second } = await pairWithTokens()
      await unlink(first).expect(200)

      await http()
        .get('/api/v1/couples/me')
        .set(...bearer(second.token))
        .expect(200)
      await http()
        .get('/api/v1/lifecycle-probe')
        .set(...bearer(second.token))
        .expect(200)
      await http()
        .patch('/api/v1/couples/me')
        .set(...bearer(second.token))
        .send({ startedOn: '2024-01-01' })
        .expect(409)
      await http()
        .post('/api/v1/lifecycle-probe')
        .set(...bearer(second.token))
        .expect(409)
      await http()
        .delete('/api/v1/lifecycle-probe')
        .set(...bearer(second.token))
        .expect(409)
      await http()
        .post('/api/v1/export')
        .set(...bearer(second.token))
        .expect(204)
      await unlink(second).expect(409)
    })

    it('유예 중에는 두 사람 모두 새 초대 코드를 만들 수 없다(409)', async () => {
      const { first, second } = await pairWithTokens()
      await unlink(first).expect(200)
      await Promise.all(
        [first, second].map((who) =>
          http()
            .post('/api/v1/couples/invites')
            .set(...bearer(who.token))
            .expect(409),
        ),
      )
    })
  })

  describe('POST /couples/me/reconnect', () => {
    it('한 명만 확인하면 UNLINKING 유지, 두 명 모두 확인하면 ACTIVE + purgeAfter null', async () => {
      const { paired, first, second } = await pairWithTokens()
      await unlink(first).expect(200)

      const half = await reconnect(first).expect(200)
      expect(half.body.status).toBe('UNLINKING')
      const confirmed = half.body.members.find((member: { userId: string }) => member.userId === first.userId)
      expect(confirmed.reconnectConfirmedAt).toBe(NOW.toISOString())

      const done = await reconnect(second).expect(200)
      expect(done.body).toMatchObject({ status: 'ACTIVE', purgeAfter: null, unlinkRequestedAt: null })
      const couple = await prisma.couple.findUniqueOrThrow({
        where: { id: paired.couple.id },
        include: { members: true },
      })
      expect(couple).toMatchObject({ status: 'ACTIVE', purgeAfter: null, unlinkRequestedBy: null })
      expect(couple.members.every((member) => member.reconnectConfirmedAt === null)).toBe(true)

      await http()
        .patch('/api/v1/couples/me')
        .set(...bearer(second.token))
        .send({ startedOn: '2024-01-01' })
        .expect(200)
    })

    it('ACTIVE 커플의 reconnect는 409', async () => {
      const { first } = await pairWithTokens()
      await reconnect(first).expect(409)
    })

    it('유예 기간(purgeAfter)이 지나면 재연결할 수 없다(409)', async () => {
      const { paired, first } = await pairWithTokens()
      await unlink(first).expect(200)
      await prisma.couple.update({ where: { id: paired.couple.id }, data: { purgeAfter: new Date(NOW.getTime() - 1) } })
      await reconnect(first).expect(409)
    })
  })

  describe('DELETE /me (회원 탈퇴)', () => {
    const kakaoUser = async (sub: string) => {
      const user = await createUser(prisma)
      await prisma.authAccount.create({ data: { userId: user.id, provider: 'KAKAO', providerSub: sub } })
      await grantRequiredConsents(prisma, [user.id])
      return user
    }
    const consentedUser = async () => {
      const user = await createUser(prisma)
      await grantRequiredConsents(prisma, [user.id])
      return user
    }

    it('커플이면 UNLINKING으로 바꾸고 User는 DELETED(계정·세션·푸시 토큰 삭제), 카카오 unlink 1회', async () => {
      const deleting = await kakaoUser('4100000001')
      const partner = await consentedUser()
      const couple = await prisma.couple.create({
        data: {
          members: {
            create: [
              { userId: deleting.id, slot: 1 },
              { userId: partner.id, slot: 2 },
            ],
          },
        },
      })
      const entry = await createEntry(prisma, couple.id, deleting.id)
      await prisma.pushToken.create({
        data: { userId: deleting.id, expoToken: 'ExponentPushToken[gone]', platform: 'IOS' },
      })
      const token = await tokenFor(app, deleting.id)

      await http()
        .delete('/api/v1/me')
        .set(...bearer(token))
        .expect(204)

      const user = await prisma.user.findUniqueOrThrow({ where: { id: deleting.id } })
      expect(user).toMatchObject({ status: 'DELETED', displayName: null })
      expect(user.deletedAt?.toISOString()).toBe(NOW.toISOString())
      expect(await prisma.authAccount.count({ where: { userId: deleting.id } })).toBe(0)
      expect(await prisma.session.count({ where: { userId: deleting.id } })).toBe(0)
      expect(await prisma.pushToken.count({ where: { userId: deleting.id } })).toBe(0)
      expect((await prisma.couple.findUniqueOrThrow({ where: { id: couple.id } })).status).toBe('UNLINKING')
      // 상대가 30일간 내보낼 수 있게 작성 기록은 남는다
      expect((await prisma.diaryEntry.findUniqueOrThrow({ where: { id: entry.id } })).authorId).toBe(deleting.id)
      expect(kakaoUnlink.unlink).toHaveBeenCalledTimes(1)
      expect(kakaoUnlink.unlink).toHaveBeenCalledWith('4100000001')

      await http()
        .get('/api/v1/me')
        .set(...bearer(token))
        .expect(401)
      const partnerToken = await tokenFor(app, partner.id)
      const view = await http()
        .get('/api/v1/couples/me')
        .set(...bearer(partnerToken))
        .expect(200)
      expect(view.body.members).toHaveLength(2)
    })

    it('탈퇴한 사람이 있으면 상대 혼자 재연결을 확인해도 UNLINKING 유지', async () => {
      const deleting = await kakaoUser('4100000002')
      const partner = await consentedUser()
      await prisma.couple.create({
        data: {
          members: {
            create: [
              { userId: deleting.id, slot: 1 },
              { userId: partner.id, slot: 2 },
            ],
          },
        },
      })
      const deletingToken = await tokenFor(app, deleting.id)
      await unlink({ userId: deleting.id, token: deletingToken }).expect(200)
      await reconnect({ userId: deleting.id, token: deletingToken }).expect(200)
      await http()
        .delete('/api/v1/me')
        .set(...bearer(deletingToken))
        .expect(204)

      const res = await reconnect({ userId: partner.id, token: await tokenFor(app, partner.id) }).expect(200)
      expect(res.body.status).toBe('UNLINKING')
    })

    it('커플이 없으면 User 행을 바로 지운다(hard delete)', async () => {
      const lonely = await kakaoUser('4100000003')
      const token = await tokenFor(app, lonely.id)
      await http()
        .post('/api/v1/couples/invites')
        .set(...bearer(token))
        .expect(201)
      await http()
        .delete('/api/v1/me')
        .set(...bearer(token))
        .expect(204)
      expect(await prisma.user.count({ where: { id: lonely.id } })).toBe(0)
      expect(await prisma.coupleInvite.count()).toBe(0)
      expect(kakaoUnlink.unlink).toHaveBeenCalledWith('4100000003')
    })

    it("dev 계정('dev:' sub)은 카카오 unlink를 호출하지 않고, unlink 실패는 탈퇴를 막지 않는다", async () => {
      const dev = await kakaoUser('dev:tester')
      const real = await kakaoUser('4100000004')
      kakaoUnlink.unlink.mockRejectedValue(new Error('카카오 장애'))
      await http()
        .delete('/api/v1/me')
        .set(...bearer(await tokenFor(app, dev.id)))
        .expect(204)
      expect(kakaoUnlink.unlink).not.toHaveBeenCalled()
      await http()
        .delete('/api/v1/me')
        .set(...bearer(await tokenFor(app, real.id)))
        .expect(204)
      expect(await prisma.user.count()).toBe(0)
    })
  })
})
