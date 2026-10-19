import { randomUUID } from 'node:crypto'
import { type INestApplication, Logger } from '@nestjs/common'
import request from 'supertest'
import { DM_PUSH_BODY } from '../../src/dm/dm-rules'
import { publicMainKey, publicThumbKey } from '../../src/media/media-keys'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { ReportService } from '../../src/moderation/report.service'
import { InAppNotificationService } from '../../src/notifications/in-app-notification.service'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { dmApi } from './dm-helpers'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { uniqueViolationCode } from './prisma-error-code'
import { createTestApp } from './setup-app'
import { ageAccounts, createFakePushSender } from './social-helpers'
import { truncateAll } from './truncate'

type Session = Awaited<ReturnType<typeof consentedLogin>>

describe('1:1 DM REST (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let dm: ReturnType<typeof dmApi>
  const push = createFakePushSender()
  const memory = createInMemoryStorage()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(push.sender)
        .overrideProvider(OBJECT_STORAGE)
        .useValue(memory.storage),
    )
    prisma = app.get(PrismaService)
    dm = dmApi(app)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    push.reset()
    memory.reset()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const login = async (nickname: string): Promise<Session> => {
    const session = await consentedLogin(app, nickname)
    await prisma.pushToken.create({
      data: { userId: session.userId, expoToken: `ExponentPushToken[${nickname}]`, platform: 'IOS' },
    })
    return session
  }
  const mutual = async (a: Session, b: Session) => {
    await dm.follow(a.accessToken, b.userId).expect(200)
    await dm.follow(b.accessToken, a.userId).expect(200)
    push.reset()
    await prisma.notification.deleteMany()
  }
  const open = async (from: Session, to: Session): Promise<string> => {
    const res = await dm.open(from.accessToken, to.userId).expect(200)
    return res.body.id
  }
  const send = async (from: Session, conversationId: string, body = '안녕하세요'): Promise<string> => {
    const res = await dm.send(from.accessToken, conversationId, { body }).expect(201)
    return res.body.id
  }
  const pushedTo = (nickname: string) =>
    push.sent().filter((message) => message.to === `ExponentPushToken[${nickname}]`)

  describe('대화 만들기·요청함', () => {
    it('맞팔이면 둘 다 ACCEPTED, 같은 쌍은 누가 열어도 같은 대화(low/high 유니크)', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const first = await dm.open(a.accessToken, b.userId).expect(200)
      expect(first.body).toMatchObject({
        peer: { id: b.userId, nickname: '비이' },
        state: 'ACCEPTED',
        lastMessage: null,
        unreadCount: 0,
        peerLastReadMessageId: null,
      })
      const again = await dm.open(b.accessToken, a.userId).expect(200)
      expect(again.body.id).toBe(first.body.id)
      expect(again.body.state).toBe('ACCEPTED')
      expect(await prisma.conversation.count()).toBe(1)
      const members = await prisma.conversationMember.findMany({ where: { conversationId: first.body.id } })
      expect(members.map((member) => member.state)).toEqual(['ACCEPTED', 'ACCEPTED'])
    })

    it('비맞팔 C→A: A는 REQUEST(요청함), 첫 메시지에 DM_REQUEST 알림 1개, 수락 전에는 푸시 없음', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      // 한쪽만 팔로우 = 맞팔 아님
      await dm.follow(c.accessToken, a.userId).expect(200)
      await prisma.notification.deleteMany()
      push.reset()

      const conversationId = await open(c, a)
      expect((await dm.get(c.accessToken, conversationId).expect(200)).body.state).toBe('ACCEPTED')
      expect((await dm.get(a.accessToken, conversationId).expect(200)).body.state).toBe('REQUEST')
      // 메시지 없는 요청은 받은 사람 목록에 보이지 않는다
      expect((await dm.list(a.accessToken, 'REQUEST').expect(200)).body.items).toEqual([])

      await send(c, conversationId, '성수동 산책 코스 여쭤봐도 될까요?')
      await send(c, conversationId, '답장 기다릴게요')
      const requests = await dm.list(a.accessToken, 'REQUEST').expect(200)
      expect(requests.body.items).toHaveLength(1)
      expect(requests.body.items[0]).toMatchObject({
        id: conversationId,
        state: 'REQUEST',
        peer: { id: c.userId },
        unreadCount: 2,
        lastMessage: { body: '답장 기다릴게요' },
      })
      expect((await dm.list(a.accessToken, 'ACCEPTED').expect(200)).body.items).toEqual([])
      expect((await dm.list(c.accessToken, 'ACCEPTED').expect(200)).body.items).toHaveLength(1)

      const notices = await prisma.notification.findMany({ where: { userId: a.userId } })
      expect(notices).toMatchObject([{ kind: 'DM_REQUEST', actorId: c.userId, refId: conversationId }])
      expect(pushedTo('에이')).toEqual([])

      // 수락 → 대화 탭으로, 이후 메시지는 푸시(소켓 없음)
      const accepted = await dm.accept(a.accessToken, conversationId).expect(200)
      expect(accepted.body.state).toBe('ACCEPTED')
      expect((await dm.list(a.accessToken, 'REQUEST').expect(200)).body.items).toEqual([])
      expect((await dm.list(a.accessToken, 'ACCEPTED').expect(200)).body.items).toHaveLength(1)
      await send(c, conversationId, '수락 감사해요')
      expect(pushedTo('에이')).toHaveLength(1)
      // LOW-6: 제목은 보낸 사람 닉네임, 본문은 미리보기 없는 고정 문구
      expect(pushedTo('에이')[0]).toMatchObject({
        title: '씨이',
        body: DM_PUSH_BODY,
        data: { kind: 'DM', conversationId },
      })
    })

    it('DM_REQUEST 알림은 (받는 사람, 보낸 사람)당 1개: 대화를 숨겼다 다시 열어 보내도 늘지 않고, 거절하면 지워진다', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      const conversationId = await open(c, a)
      await send(c, conversationId)
      await dm.leave(c.accessToken, conversationId).expect(204)
      await open(c, a)
      await send(c, conversationId, '한 번 더')
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'DM_REQUEST' } })).toBe(1)
      await dm.leave(a.accessToken, conversationId).expect(204)
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'DM_REQUEST' } })).toBe(0)
    })

    it('요청을 수락하면 그 요청의 DM_REQUEST 알림이 지워진다', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      const conversationId = await open(c, a)
      await send(c, conversationId)
      await dm.accept(a.accessToken, conversationId).expect(200)
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'DM_REQUEST' } })).toBe(0)
    })

    it('QA1 P2: 요청받은 사람이 답장해 자동 수락되면 그 요청의 DM_REQUEST 알림도 지워진다', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      const conversationId = await open(c, a)
      await send(c, conversationId)
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'DM_REQUEST' } })).toBe(1)
      await send(a, conversationId, '반가워요')
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'DM_REQUEST' } })).toBe(0)
    })

    it('요청받은 사람이 답장하면 자동 수락된다', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      const conversationId = await open(c, a)
      await send(c, conversationId)
      await send(a, conversationId, '네 반가워요')
      expect((await dm.get(a.accessToken, conversationId).expect(200)).body.state).toBe('ACCEPTED')
    })

    it('수신 거부(notifyDm=false)면 수락된 대화도 푸시를 보내지 않는다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      await prisma.user.update({ where: { id: b.userId }, data: { notifyDm: false } })
      const conversationId = await open(a, b)
      await send(a, conversationId)
      expect(pushedTo('비이')).toEqual([])
    })

    it('자기 자신 400, 없는·정지된 사용자 404', async () => {
      const a = await login('에이')
      const suspended = await login('정지')
      await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })
      await dm.open(a.accessToken, a.userId).expect(400)
      await dm.open(a.accessToken, '0199e3a0-0000-7000-8000-000000000999').expect(404)
      await dm.open(a.accessToken, suspended.userId).expect(404)
    })

    it('대화 삭제(나에게서 숨김): 수락된 대화는 새 메시지가 오면 다시 보이고, 거절한 요청은 계속 숨겨진다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const c = await login('씨이')
      await mutual(a, b)
      const ab = await open(a, b)
      await send(a, ab)
      await dm.leave(b.accessToken, ab).expect(204)
      expect((await dm.list(b.accessToken).expect(200)).body.items).toEqual([])
      await send(a, ab, '다시 연락드려요')
      expect((await dm.list(b.accessToken).expect(200)).body.items).toHaveLength(1)

      const ca = await open(c, a)
      await send(c, ca)
      await dm.leave(a.accessToken, ca).expect(204)
      push.reset()
      await send(c, ca, '왜 거절하세요')
      expect((await dm.list(a.accessToken, 'REQUEST').expect(200)).body.items).toEqual([])
      expect(pushedTo('에이')).toEqual([])
    })
  })

  describe('권한·차단·멱등', () => {
    it('차단 후에는 전송·대화 생성·조회 403, 받은편지함에서 사라진다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      await send(a, conversationId)
      await dm.block(b.accessToken, a.userId).expect(204)

      await dm.send(a.accessToken, conversationId).expect(403)
      await dm.send(b.accessToken, conversationId).expect(403)
      await dm.open(a.accessToken, b.userId).expect(403)
      await dm.messages(a.accessToken, conversationId).expect(403)
      expect((await dm.list(a.accessToken).expect(200)).body.items).toEqual([])
      expect((await dm.list(b.accessToken).expect(200)).body.items).toEqual([])
      expect(await prisma.message.count()).toBe(1)
    })

    it('같은 clientMessageId로 재전송하면 1행만 남고 같은 메시지를 돌려준다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const payload = { clientMessageId: 'retry-0001-abcdef', body: '한 번만 저장돼야 해요' }
      const first = await dm.send(a.accessToken, conversationId, payload).expect(201)
      const second = await dm.send(a.accessToken, conversationId, payload).expect(201)
      expect(second.body.id).toBe(first.body.id)
      expect(await prisma.message.count()).toBe(1)
      expect(pushedTo('비이')).toHaveLength(1)
    })

    it('비멤버는 대화·메시지 조회/전송/읽음 모두 403', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const outsider = await login('남남')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const messageId = await send(a, conversationId)
      await dm.get(outsider.accessToken, conversationId).expect(403)
      await dm.messages(outsider.accessToken, conversationId).expect(403)
      await dm.send(outsider.accessToken, conversationId).expect(403)
      await dm.read(outsider.accessToken, conversationId, messageId).expect(403)
      await dm.accept(outsider.accessToken, conversationId).expect(403)
    })

    it('본문·사진이 둘 다 없으면 400, 로그인 없이 401', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const conversationId = await open(a, b)
      await dm.send(a.accessToken, conversationId, { body: '   ' }).expect(400)
      await request(app.getHttpServer()).get('/api/v1/dm/conversations').expect(401)
    })

    it('LOW-3: 내가 참여하지 않은 대화 id를 목록 커서로 쓰면 잘못된 커서와 같은 400', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const c = await login('씨이')
      const bc = await open(b, c)
      await send(b, bc)
      const mine = await open(a, b)
      await send(a, mine)
      const foreign = await dm.list(a.accessToken, 'ACCEPTED', `&cursor=${bc}`).expect(400)
      const unknown = await dm.list(a.accessToken, 'ACCEPTED', '&cursor=0199e3a0-0000-7000-8000-000000000999')
      expect(unknown.status).toBe(400)
      expect(foreign.body.message).toBe(unknown.body.message)
      await dm.list(a.accessToken, 'ACCEPTED', `&cursor=${mine}`).expect(200)
    })

    it('Note: DM_REQUEST 알림은 DB가 (받는 사람, 보낸 사람)당 1개로 막고, 동시 알림 경쟁은 조용히 무시한다', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      const conversationId = await open(c, a)
      const duplicate = { userId: a.userId, actorId: c.userId, kind: 'DM_REQUEST' as const, refId: conversationId }
      await prisma.notification.create({ data: duplicate })
      expect(await uniqueViolationCode(prisma.notification.create({ data: duplicate }))).toBe('P2002')
      // 다른 종류의 알림은 같은 쌍이어도 여러 개 가능
      await prisma.notification.create({ data: { ...duplicate, kind: 'FOLLOW', refId: null } })
      await prisma.notification.create({ data: { ...duplicate, kind: 'FOLLOW', refId: null } })
      await prisma.notification.deleteMany()

      const warn = jest.spyOn(Logger.prototype, 'warn')
      const notices = app.get(InAppNotificationService)
      const notice = { kind: 'DM_REQUEST' as const, recipientId: a.userId, actorId: c.userId, refId: conversationId }
      await Promise.all([1, 2, 3, 4].map(() => notices.notify(notice)))
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'DM_REQUEST' } })).toBe(1)
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('[notification] DM_REQUEST'))
      warn.mockRestore()
    })
  })

  describe('메시지·읽음', () => {
    it('읽음: 안 읽은 수가 줄고 상대에게 peerLastReadMessageId로 보인다(뒤로 가지 않는다)', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const ids = [
        await send(a, conversationId, '1'),
        await send(a, conversationId, '2'),
        await send(a, conversationId, '3'),
      ]
      expect((await dm.list(b.accessToken).expect(200)).body.items[0]).toMatchObject({ unreadCount: 3 })
      // 내가 보낸 메시지는 내 안 읽음에 들어가지 않는다
      expect((await dm.list(a.accessToken).expect(200)).body.items[0]).toMatchObject({ unreadCount: 0 })

      await dm.read(b.accessToken, conversationId, ids[1]!).expect(204)
      expect((await dm.list(b.accessToken).expect(200)).body.items[0]).toMatchObject({ unreadCount: 1 })
      expect((await dm.get(a.accessToken, conversationId).expect(200)).body.peerLastReadMessageId).toBe(ids[1])

      await dm.read(b.accessToken, conversationId, ids[0]!).expect(204)
      expect((await dm.get(a.accessToken, conversationId).expect(200)).body.peerLastReadMessageId).toBe(ids[1])
    })

    it('수락 전 요청함 사용자의 읽음은 보낸 사람에게 보이지 않는다', async () => {
      const a = await login('에이')
      const c = await login('씨이')
      const conversationId = await open(c, a)
      const messageId = await send(c, conversationId)
      await dm.read(a.accessToken, conversationId, messageId).expect(204)
      expect((await dm.get(c.accessToken, conversationId).expect(200)).body.peerLastReadMessageId).toBeNull()
      await dm.accept(a.accessToken, conversationId).expect(200)
      expect((await dm.get(c.accessToken, conversationId).expect(200)).body.peerLastReadMessageId).toBe(messageId)
    })

    it('다른 대화의 메시지로 읽음 처리하면 404', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const c = await login('씨이')
      const ab = await open(a, b)
      const ac = await open(a, c)
      const other = await send(a, ac)
      await dm.read(b.accessToken, ab, other).expect(404)
    })

    it('최신순 커서 페이지 + after(재연결 시 놓친 메시지 오래된순)', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const ids: string[] = []
      for (const body of ['m1', 'm2', 'm3', 'm4', 'm5']) ids.push(await send(a, conversationId, body))

      const first = await dm.messages(b.accessToken, conversationId, '?limit=2').expect(200)
      expect(first.body.items.map((m: { body: string }) => m.body)).toEqual(['m5', 'm4'])
      const second = await dm.messages(b.accessToken, conversationId, `?limit=2&cursor=${first.body.nextCursor}`)
      expect(second.body.items.map((m: { body: string }) => m.body)).toEqual(['m3', 'm2'])

      const missed = await dm.messages(b.accessToken, conversationId, `?after=${ids[1]}&limit=2`).expect(200)
      expect(missed.body.items.map((m: { body: string }) => m.body)).toEqual(['m3', 'm4'])
      const rest = await dm.messages(b.accessToken, conversationId, `?after=${missed.body.nextCursor}`).expect(200)
      expect(rest.body).toMatchObject({ items: [{ body: 'm5' }], nextCursor: null })
      await dm.messages(b.accessToken, conversationId, `?after=${ids[0]}&cursor=${ids[4]}`).expect(400)
    })

    it('사진 메시지: 내 DM 사진만, 같은 사진을 두 번 붙일 수 없다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const mediaId = await uploadImage(app, prisma, memory, a.accessToken, 'DM')
      const sent = await dm.send(a.accessToken, conversationId, { mediaId }).expect(201)
      expect(sent.body).toMatchObject({ body: null, imageUrl: expect.stringMatching(new RegExp(`/p/${mediaId}/1440\\.jpg$`)) })
      await dm.send(a.accessToken, conversationId, { mediaId }).expect(422)
      const others = await uploadImage(app, prisma, memory, b.accessToken, 'DM')
      await dm.send(a.accessToken, conversationId, { mediaId: others }).expect(422)
      const postMedia = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
      await dm.send(a.accessToken, conversationId, { mediaId: postMedia }).expect(422)
      const pushed = pushedTo('비이')
      expect(pushed[0]).toMatchObject({ body: DM_PUSH_BODY })
    })

    it('LOW-4: 같은 사진을 동시에 여러 메시지에 붙여도 DB 유니크가 1개만 남기고 나머지는 422 MEDIA_NOT_USABLE', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const mediaId = await uploadImage(app, prisma, memory, a.accessToken, 'DM')
      // DB 제약: mediaId는 메시지 하나에만(NULL은 여러 개 가능)
      const base = { conversationId, senderId: a.userId }
      await prisma.message.create({ data: { ...base, clientMessageId: randomUUID(), body: '텍스트1' } })
      await prisma.message.create({ data: { ...base, clientMessageId: randomUUID(), body: '텍스트2' } })
      await prisma.message.create({ data: { ...base, clientMessageId: randomUUID(), mediaId } })
      expect(
        await uniqueViolationCode(prisma.message.create({ data: { ...base, clientMessageId: randomUUID(), mediaId } })),
      ).toBe('P2002')
      await prisma.message.deleteMany()

      const responses = await Promise.all([1, 2, 3, 4, 5].map(() => dm.send(a.accessToken, conversationId, { mediaId })))
      const statuses = responses.map((res) => res.status).sort()
      expect(statuses).toEqual([201, 422, 422, 422, 422])
      responses
        .filter((res) => res.status === 422)
        .forEach((res) => expect(res.body.code).toBe('MEDIA_NOT_USABLE'))
      expect(await prisma.message.count({ where: { mediaId } })).toBe(1)
    })
  })

  describe('탈퇴·신고', () => {
    it('탈퇴한 상대: 메시지 body·발신자 null, "탈퇴한 사용자" 표기, 전송 403, 멤버 행 삭제', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      await send(b, conversationId, '곧 탈퇴해요')
      await request(app.getHttpServer())
        .delete('/api/v1/me')
        .set(...bearer(b.accessToken))
        .expect(204)

      const page = await dm.messages(a.accessToken, conversationId).expect(200)
      expect(page.body.items).toMatchObject([{ body: null, senderId: null, imageUrl: null }])
      const inbox = await dm.list(a.accessToken).expect(200)
      expect(inbox.body.items[0]).toMatchObject({ peer: { nickname: '탈퇴한 사용자' } })
      await dm.send(a.accessToken, conversationId).expect(403)
      expect(await prisma.conversationMember.count({ where: { userId: b.userId } })).toBe(0)
    })

    it('MESSAGE 신고: 대화 멤버만(비멤버 404, 내 메시지 400), 운영자 숨김 → 목록·미리보기에서 빠지고 해제하면 복구', async () => {
      const a = await login('에이')
      const b = await login('비이')
      const outsider = await login('남남')
      await ageAccounts(prisma, [a.userId, b.userId, outsider.userId])
      await mutual(a, b)
      const conversationId = await open(a, b)
      await send(a, conversationId, '정상')
      const bad = await send(a, conversationId, '스팸 메시지')

      await dm.report(outsider.accessToken, bad).expect(404)
      await dm.report(a.accessToken, bad).expect(400)
      const report = await dm.report(b.accessToken, bad).expect(201)

      const reports = app.get(ReportService)
      await reports.resolve(report.body.id, 'hide')
      const hidden = await dm.messages(b.accessToken, conversationId).expect(200)
      expect(hidden.body.items.map((m: { body: string }) => m.body)).toEqual(['정상'])
      expect((await dm.list(b.accessToken).expect(200)).body.items[0].lastMessage.body).toBe('정상')

      await prisma.report.updateMany({ data: { status: 'PENDING' } })
      await reports.resolve(report.body.id, 'dismiss')
      const restored = await dm.messages(b.accessToken, conversationId).expect(200)
      expect(restored.body.items).toHaveLength(2)
    })

    it('MESSAGE 신고: 차단 관계가 되면 404(존재를 숨긴다)', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const messageId = await send(a, conversationId, '나중에 차단될 사람의 메시지')
      await dm.block(b.accessToken, a.userId).expect(204)
      await dm.report(b.accessToken, messageId).expect(404)
    })

    it('LOW-5: 운영자가 사진 메시지를 숨기면 그 Media 행과 R2 객체(본 이미지·썸네일)를 지운다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await ageAccounts(prisma, [a.userId, b.userId])
      await mutual(a, b)
      const conversationId = await open(a, b)
      const mediaId = await uploadImage(app, prisma, memory, a.accessToken, 'DM')
      const photo = await dm.send(a.accessToken, conversationId, { mediaId }).expect(201)
      const keepId = await uploadImage(app, prisma, memory, a.accessToken, 'DM')
      await dm.send(a.accessToken, conversationId, { mediaId: keepId }).expect(201)
      const objects = (id: string) => [
        { bucket: 'PUBLIC' as const, key: publicMainKey(id) },
        { bucket: 'PUBLIC' as const, key: publicThumbKey(id) },
      ]
      expect(objects(mediaId).every((object) => memory.has(object))).toBe(true)

      const report = await dm.report(b.accessToken, photo.body.id).expect(201)
      await app.get(ReportService).resolve(report.body.id, 'hide')

      expect(await prisma.media.count({ where: { id: mediaId } })).toBe(0)
      expect(objects(mediaId).some((object) => memory.has(object))).toBe(false)
      expect(await prisma.message.findUniqueOrThrow({ where: { id: photo.body.id } })).toMatchObject({
        mediaId: null,
        hiddenAt: expect.any(Date),
      })
      // 다른 메시지의 사진은 그대로
      expect(objects(keepId).every((object) => memory.has(object))).toBe(true)
    })

    it('LOW-5: 보낸 사람이 탈퇴하면 그가 보낸 DM 사진의 Media 행과 R2 객체를 지운다', async () => {
      const a = await login('에이')
      const b = await login('비이')
      await mutual(a, b)
      const conversationId = await open(a, b)
      const mediaId = await uploadImage(app, prisma, memory, b.accessToken, 'DM')
      await dm.send(b.accessToken, conversationId, { mediaId }).expect(201)
      await request(app.getHttpServer())
        .delete('/api/v1/me')
        .set(...bearer(b.accessToken))
        .expect(204)
      expect(await prisma.media.count({ where: { id: mediaId } })).toBe(0)
      expect(memory.has({ bucket: 'PUBLIC', key: publicMainKey(mediaId) })).toBe(false)
      expect(memory.has({ bucket: 'PUBLIC', key: publicThumbKey(mediaId) })).toBe(false)
    })
  })
})
