import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { deletedUserLedgerKey, unlinkedCoupleLedgerKey } from '../../src/storage/storage-keys'
import { KakaoUnlinkClient } from '../../src/users/kakao-unlink.client'
import { LedgerReplayService } from '../../src/users/ledger-replay.service'
import { bearer, tokenFor } from './auth-helpers'
import { createPairedCouple, createUser, grantRequiredConsents, type PairedCouple } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

// 백업 복원(ADR-003)으로 지운 행이 되살아나도 R2 원장을 근거로 탈퇴·연결 해제를 다시 적용한다
describe('탈퇴 원장과 복원 재적용 (실DB + 메모리 스토리지)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let storage: MemoryObjectStorage
  const push = createFakePush()
  const kakaoUnlink = { unlink: jest.fn<Promise<void>, [string]>() }

  const http = () => request(app.getHttpServer())
  const deleteMe = async (userId: string) =>
    http()
      .delete('/api/v1/me')
      .set(...bearer(await tokenFor(app, userId)))
  const replay = () => app.get(LedgerReplayService).replayAll()

  // 로그인 수단·기기가 붙은 사용자(백업 복원 흉내에도 같은 모양을 다시 넣는다)
  const attachAccount = async (userId: string, sub: string) => {
    await prisma.authAccount.create({ data: { userId, provider: 'KAKAO', providerSub: sub } })
    await prisma.pushToken.create({ data: { userId, expoToken: `ExponentPushToken[${sub}]`, platform: 'IOS' } })
  }
  const pairedWithConsents = async (): Promise<PairedCouple> => {
    const paired = await createPairedCouple(prisma)
    await grantRequiredConsents(
      prisma,
      paired.members.map((member) => member.id),
    )
    return paired
  }
  const userState = async (userId: string) => ({
    user: await prisma.user.findUnique({ where: { id: userId }, select: { status: true, displayName: true } }),
    accounts: await prisma.authAccount.count({ where: { userId } }),
    sessions: await prisma.session.count({ where: { userId } }),
    pushTokens: await prisma.pushToken.count({ where: { userId } }),
  })
  const coupleState = (coupleId: string) =>
    prisma.couple.findUnique({
      where: { id: coupleId },
      select: { status: true, purgeAfter: true, unlinkRequestedAt: true },
    })

  beforeAll(async () => {
    storage = new MemoryObjectStorage()
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(OBJECT_STORAGE)
        .useValue(storage)
        .overrideProvider(PUSH_SENDER)
        .useValue(push.sender)
        .overrideProvider(KakaoUnlinkClient)
        .useValue(kakaoUnlink),
    )
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    storage.clear()
    push.reset()
    jest.restoreAllMocks()
    kakaoUnlink.unlink.mockReset()
    kakaoUnlink.unlink.mockResolvedValue(undefined)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('DELETE /me', () => {
    it('커플이 없으면 원장 키를 쓰고 User를 지운다', async () => {
      const user = await createUser(prisma)
      expect((await deleteMe(user.id)).status).toBe(204)
      expect(await storage.head(deletedUserLedgerKey(user.id))).not.toBeNull()
      expect(await prisma.user.count({ where: { id: user.id } })).toBe(0)
    })

    it.each([
      ['커플 없음', false],
      ['커플 있음', true],
    ])('%s: 원장 쓰기가 실패하면 5xx이고 DB는 그대로다', async (_label, hasCouple) => {
      const paired = hasCouple ? await pairedWithConsents() : null
      const user = paired?.members[0] ?? (await createUser(prisma))
      await attachAccount(user.id, '4200000001')
      const token = await tokenFor(app, user.id)
      const before = await userState(user.id)
      const coupleBefore = paired ? await coupleState(paired.couple.id) : null
      jest.spyOn(storage, 'putObject').mockRejectedValue(new Error('R2 장애'))

      const res = await http()
        .delete('/api/v1/me')
        .set(...bearer(token))
      expect(res.status).toBeGreaterThanOrEqual(500)
      expect(await userState(user.id)).toEqual(before)
      if (paired) expect(await coupleState(paired.couple.id)).toEqual(coupleBefore)
      expect(kakaoUnlink.unlink).not.toHaveBeenCalled()
    })

    it('복원으로 되살아난 커플 없는 사용자(세션·계정·푸시 토큰 포함)를 replay가 다시 지운다', async () => {
      const user = await createUser(prisma)
      expect((await deleteMe(user.id)).status).toBe(204)
      // 백업 복원 흉내: 같은 id의 사용자·계정·세션·푸시 토큰
      await createUserWithId(user.id)
      await attachAccount(user.id, '4200000002')
      await tokenFor(app, user.id)

      const result = await replay()
      expect(result.deletedUsers).toBe(1)
      expect(await prisma.user.count({ where: { id: user.id } })).toBe(0)
      expect(await prisma.authAccount.count()).toBe(0)
      expect(await prisma.session.count()).toBe(0)
      // 멱등: 다시 돌려도 오류 없이 같은 결과
      await expect(replay()).resolves.toMatchObject({ deletedUsers: 1 })
    })

    it('복원으로 ACTIVE로 돌아간 커플 탈퇴자를 replay가 DELETED로 되돌리고, 커플은 원래 purgeAfter로 UNLINKING', async () => {
      const { couple, members } = await pairedWithConsents()
      const [deleting, partner] = members
      expect((await deleteMe(deleting.id)).status).toBe(204)
      const original = await coupleState(couple.id)
      expect(original?.status).toBe('UNLINKING')
      expect(await storage.head(unlinkedCoupleLedgerKey(couple.id))).not.toBeNull()

      // 백업 복원 흉내: 탈퇴 전 상태로
      await prisma.user.update({ where: { id: deleting.id }, data: { status: 'ACTIVE', deletedAt: null } })
      await prisma.couple.update({
        where: { id: couple.id },
        data: { status: 'ACTIVE', purgeAfter: null, unlinkRequestedAt: null, unlinkRequestedBy: null },
      })
      await attachAccount(deleting.id, '4200000003')
      await tokenFor(app, deleting.id)
      push.reset()

      await replay()
      expect(await userState(deleting.id)).toEqual({
        user: { status: 'DELETED', displayName: null },
        accounts: 0,
        sessions: 0,
        pushTokens: 0,
      })
      expect(await coupleState(couple.id)).toEqual(original)
      expect((await userState(partner.id)).user?.status).toBe('ACTIVE')
      // 복원 재적용은 상대에게 다시 알리지 않는다
      expect(push.sent()).toEqual([])
    })
  })

  const createUserWithId = (id: string) => prisma.user.create({ data: { id, displayName: '복원됨' } })
})
