import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { createFakePushSender, seedPosts } from './social-helpers'
import { truncateAll } from './truncate'

// Phase 4 보안 리뷰 후속: 알림 중복 억제·팔로우 커서·신고 대상 가시성·알림 actor 가시성·검색 이스케이프
describe('소셜 보안 리뷰 후속 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  const push = createFakePushSender()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp((builder) => builder.overrideProvider(PUSH_SENDER).useValue(push.sender))
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    push.reset()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const http = () => request(app.getHttpServer())
  const get = (token: string, path: string) =>
    http()
      .get(`/api/v1${path}`)
      .set(...bearer(token))
  const follow = (token: string, userId: string) =>
    http()
      .put(`/api/v1/users/${userId}/follow`)
      .set(...bearer(token))
  const unfollow = (token: string, userId: string) =>
    http()
      .delete(`/api/v1/users/${userId}/follow`)
      .set(...bearer(token))
  const comment = (token: string, postId: string, body: string) =>
    http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(...bearer(token))
      .send({ body })
  const block = (token: string, userId: string) =>
    http()
      .post(`/api/v1/blocks/${userId}`)
      .set(...bearer(token))
      .expect(204)
  const report = (token: string, targetType: 'POST' | 'COMMENT', targetId: string) =>
    http()
      .post('/api/v1/reports')
      .set(...bearer(token))
      .send({ targetType, targetId, reason: 'SPAM' })
  const withToken = async (nickname: string) => {
    const session = await consentedLogin(app, nickname)
    await prisma.pushToken.create({
      data: { userId: session.userId, expoToken: `ExponentPushToken[${nickname}]`, platform: 'IOS' },
    })
    return session
  }

  describe('MEDIUM: 알림 중복 억제', () => {
    it('팔로우→언팔로우→팔로우 반복 → FOLLOW 알림 행 1개, 푸시 1회', async () => {
      const a = await withToken('에이')
      const b = await consentedLogin(app, '비이')
      for (let round = 0; round < 3; round += 1) {
        await follow(b.accessToken, a.userId).expect(200)
        await unfollow(b.accessToken, a.userId).expect(200)
      }
      await follow(b.accessToken, a.userId).expect(200)
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'FOLLOW' } })).toBe(1)
      expect(push.sent()).toHaveLength(1)
    })

    it('같은 사람이 같은 게시물에 댓글 3개(5분 안) → 인앱 행 3개, 푸시 1회', async () => {
      const a = await withToken('에이')
      const b = await consentedLogin(app, '비이')
      const [postId] = await seedPosts(prisma, a.userId, 1)
      for (const body of ['하나', '둘', '셋']) await comment(b.accessToken, postId!, body).expect(201)
      expect(await prisma.notification.count({ where: { userId: a.userId, kind: 'COMMENT' } })).toBe(3)
      expect(push.sent().map((message) => message.body)).toEqual(['비이님이 댓글을 남겼어요: 하나'])
    })
  })

  describe('LOW: 팔로워·팔로잉 커서도 같은 가시성 조건', () => {
    it('차단 관계·정지 사용자를 커서로 주면 없는 커서와 같은 400', async () => {
      const target = await consentedLogin(app, '타깃')
      const viewer = await consentedLogin(app, '보는이')
      const blocked = await consentedLogin(app, '차단됨')
      const suspended = await consentedLogin(app, '정지됨')
      for (const fan of [blocked, suspended, viewer]) await follow(fan.accessToken, target.userId).expect(200)
      await block(viewer.accessToken, blocked.userId)
      await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })

      const missing = await get(
        viewer.accessToken,
        `/users/${target.userId}/followers?cursor=0199e3a0-0000-7000-8000-000000000999`,
      ).expect(400)
      const blockedCursor = await get(
        viewer.accessToken,
        `/users/${target.userId}/followers?cursor=${blocked.userId}`,
      ).expect(400)
      await get(viewer.accessToken, `/users/${target.userId}/followers?cursor=${suspended.userId}`).expect(400)
      expect(blockedCursor.body.message).toBe(missing.body.message)
      await get(viewer.accessToken, `/users/${target.userId}/followers?cursor=${viewer.userId}`).expect(200)
    })
  })

  describe('LOW: 게시물·댓글 신고 대상 가시성', () => {
    it('차단 관계(양방향)면 게시물·댓글 신고 모두 404', async () => {
      const author = await consentedLogin(app, '작성자')
      const commenter = await consentedLogin(app, '댓글러')
      const reporter = await consentedLogin(app, '신고자')
      const [postId] = await seedPosts(prisma, author.userId, 1)
      const target = await comment(commenter.accessToken, postId!, '댓글').expect(201)

      await block(reporter.accessToken, author.userId)
      await report(reporter.accessToken, 'POST', postId!).expect(404)
      // 댓글 작성자와는 차단 관계가 아니어도 게시물 작성자와 차단 관계면 404
      await report(reporter.accessToken, 'COMMENT', target.body.id).expect(404)
      await report(author.accessToken, 'COMMENT', target.body.id).expect(201)

      await block(commenter.accessToken, reporter.userId)
      const other = await consentedLogin(app, '다른작성자')
      const [otherPost] = await seedPosts(prisma, other.userId, 1)
      const otherComment = await comment(commenter.accessToken, otherPost!, '다른 댓글').expect(201)
      await report(reporter.accessToken, 'COMMENT', otherComment.body.id).expect(404)
    })

    it('정지·숨김 댓글 작성자, 숨김 게시물 작성자 → 404', async () => {
      const author = await consentedLogin(app, '작성자')
      const commenter = await consentedLogin(app, '댓글러')
      const reporter = await consentedLogin(app, '신고자')
      const [postId] = await seedPosts(prisma, author.userId, 1)
      const target = await comment(commenter.accessToken, postId!, '댓글').expect(201)

      await prisma.user.update({ where: { id: commenter.userId }, data: { status: 'SUSPENDED' } })
      await report(reporter.accessToken, 'COMMENT', target.body.id).expect(404)
      await prisma.user.update({ where: { id: commenter.userId }, data: { status: 'ACTIVE', hiddenAt: new Date() } })
      await report(reporter.accessToken, 'COMMENT', target.body.id).expect(404)
      await prisma.user.update({ where: { id: commenter.userId }, data: { hiddenAt: null } })
      await prisma.user.update({ where: { id: author.userId }, data: { hiddenAt: new Date() } })
      await report(reporter.accessToken, 'COMMENT', target.body.id).expect(404)
      await report(reporter.accessToken, 'POST', postId!).expect(404)
      await prisma.user.update({ where: { id: author.userId }, data: { hiddenAt: null } })
      await report(reporter.accessToken, 'COMMENT', target.body.id).expect(201)
    })
  })

  describe('LOW: 알림함 actor 가시성', () => {
    it('정지·숨김 actor의 알림은 actor: null로 내려간다', async () => {
      const me = await consentedLogin(app, '수신자')
      const suspended = await consentedLogin(app, '정지될')
      const hidden = await consentedLogin(app, '숨겨질')
      const visible = await consentedLogin(app, '보이는')
      for (const actor of [suspended, hidden, visible]) await follow(actor.accessToken, me.userId).expect(200)
      await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })
      await prisma.user.update({ where: { id: hidden.userId }, data: { hiddenAt: new Date() } })

      const list = await get(me.accessToken, '/notifications').expect(200)
      expect(list.body.items.map((item: { actor: unknown }) => item.actor)).toEqual([
        { id: visible.userId, nickname: '보이는', avatarUrl: null },
        null,
        null,
      ])
    })
  })

  describe('LOW: 닉네임 검색 LIKE 이스케이프', () => {
    it('a_b · % 검색은 글자 그대로 비교한다', async () => {
      const me = await consentedLogin(app, 'a_b')
      await consentedLogin(app, 'axb')
      await consentedLogin(app, 'a%b')
      const underscore = await get(me.accessToken, '/users?nickname=a_b').expect(200)
      expect(underscore.body.items.map((u: { nickname: string }) => u.nickname)).toEqual(['a_b'])
      const percent = await get(me.accessToken, `/users?nickname=${encodeURIComponent('%')}`).expect(200)
      expect(percent.body.items).toEqual([])
      const literal = await get(me.accessToken, `/users?nickname=${encodeURIComponent('a%')}`).expect(200)
      expect(literal.body.items.map((u: { nickname: string }) => u.nickname)).toEqual(['a%b'])
    })
  })
})
