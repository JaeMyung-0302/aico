import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { createFakePushSender, seedPosts } from './social-helpers'
import { truncateAll } from './truncate'

describe('팔로우·검색·알림함 (실DB)', () => {
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
  const withToken = async (nickname: string) => {
    const session = await consentedLogin(app, nickname)
    await prisma.pushToken.create({
      data: { userId: session.userId, expoToken: `ExponentPushToken[${nickname}]`, platform: 'IOS' },
    })
    return session
  }

  it('팔로우 멱등·언팔로우, 자기 자신 400, 프로필 카운트·isFollowing 반영', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    expect((await follow(a.accessToken, b.userId).expect(200)).body).toEqual({ isFollowing: true })
    await follow(a.accessToken, b.userId).expect(200)
    await follow(a.accessToken, a.userId).expect(400)
    const profile = await get(a.accessToken, `/users/${b.userId}`).expect(200)
    expect(profile.body).toMatchObject({ followerCount: 1, isFollowing: true })
    const unfollowed = await http()
      .delete(`/api/v1/users/${b.userId}/follow`)
      .set(...bearer(a.accessToken))
      .expect(200)
    expect(unfollowed.body).toEqual({ isFollowing: false })
    expect(await prisma.follow.count()).toBe(0)
  })

  it('팔로워·팔로잉 목록(최신순 커서), 차단 관계 사용자는 목록에서 빠진다', async () => {
    const target = await consentedLogin(app, '타깃')
    const fans = []
    for (const nickname of ['팬1', '팬2', '팬3']) {
      const fan = await consentedLogin(app, nickname)
      await follow(fan.accessToken, target.userId).expect(200)
      fans.push(fan)
    }
    const first = await get(fans[0]!.accessToken, `/users/${target.userId}/followers?limit=2`).expect(200)
    expect(first.body.items.map((u: { nickname: string }) => u.nickname)).toEqual(['팬3', '팬2'])
    const second = await get(
      fans[0]!.accessToken,
      `/users/${target.userId}/followers?limit=2&cursor=${first.body.nextCursor}`,
    ).expect(200)
    expect(second.body).toMatchObject({ items: [{ nickname: '팬1' }], nextCursor: null })
    const following = await get(target.accessToken, `/users/${fans[0]!.userId}/following`).expect(200)
    expect(following.body.items).toEqual([{ id: target.userId, nickname: '타깃', avatarUrl: null }])

    await http()
      .post(`/api/v1/blocks/${fans[0]!.userId}`)
      .set(...bearer(fans[1]!.accessToken))
      .expect(204)
    const seenByFan2 = await get(fans[1]!.accessToken, `/users/${target.userId}/followers`).expect(200)
    expect(seenByFan2.body.items.map((u: { nickname: string }) => u.nickname)).toEqual(['팬3', '팬2'])
  })

  it('차단하면 서로의 팔로우가 해제되고 다시 팔로우할 수 없다(404)', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    await follow(a.accessToken, b.userId).expect(200)
    await follow(b.accessToken, a.userId).expect(200)
    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    expect(await prisma.follow.count()).toBe(0)
    await follow(b.accessToken, a.userId).expect(404)
  })

  it('GET /users?nickname= 접두어 검색: 차단·정지 사용자 제외', async () => {
    const me = await consentedLogin(app, '보리맘')
    await consentedLogin(app, '보리아빠')
    const blocked = await consentedLogin(app, '보리누나')
    const suspended = await consentedLogin(app, '보리형')
    await consentedLogin(app, '콩이맘')
    await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })
    await http()
      .post(`/api/v1/blocks/${blocked.userId}`)
      .set(...bearer(me.accessToken))
      .expect(204)
    const res = await get(me.accessToken, `/users?nickname=${encodeURIComponent('보리')}`).expect(200)
    expect(res.body.items.map((u: { nickname: string }) => u.nickname).sort()).toEqual(['보리맘', '보리아빠'].sort())
    await get(me.accessToken, '/users?nickname=').expect(400)
  })

  it('검색어의 _ · % 는 와일드카드가 아니라 글자 그대로 비교한다', async () => {
    const me = await consentedLogin(app, 'ab_c')
    await consentedLogin(app, 'abxc')
    const underscore = await get(me.accessToken, '/users?nickname=ab_').expect(200)
    expect(underscore.body.items.map((u: { nickname: string }) => u.nickname)).toEqual(['ab_c'])
    const percent = await get(me.accessToken, `/users?nickname=${encodeURIComponent('a%')}`).expect(200)
    expect(percent.body.items).toEqual([])
    const upper = await get(me.accessToken, '/users?nickname=AB').expect(200)
    expect(upper.body.items).toHaveLength(2)
  })

  it('좋아요·댓글·팔로우 → 알림함 + 푸시, 안 읽음 수, read-all', async () => {
    const a = await withToken('에이')
    const b = await consentedLogin(app, '비이')
    const [postId] = await seedPosts(prisma, a.userId, 1)
    await http()
      .put(`/api/v1/posts/${postId}/like`)
      .set(...bearer(b.accessToken))
      .expect(200)
    await http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(...bearer(b.accessToken))
      .send({ body: '여기 대형견도 되나요?' })
      .expect(201)
    await follow(b.accessToken, a.userId).expect(200)

    expect((await get(a.accessToken, '/notifications/unread-count').expect(200)).body).toEqual({ count: 3 })
    const list = await get(a.accessToken, '/notifications').expect(200)
    expect(list.body.items).toMatchObject([
      { kind: 'FOLLOW', actor: { id: b.userId, nickname: '비이' }, postId: null, readAt: null },
      { kind: 'COMMENT', postId, preview: '여기 대형견도 되나요?' },
      { kind: 'LIKE', postId, refId: postId },
    ])
    expect(push.sent().map((message) => message.body)).toEqual([
      '비이님이 회원님의 게시물을 좋아해요',
      '비이님이 댓글을 남겼어요: 여기 대형견도 되나요?',
      '비이님이 회원님을 팔로우해요',
    ])

    await http()
      .post('/api/v1/notifications/read-all')
      .set(...bearer(a.accessToken))
      .expect(204)
    expect((await get(a.accessToken, '/notifications/unread-count').expect(200)).body).toEqual({ count: 0 })
    expect((await get(a.accessToken, '/notifications').expect(200)).body.items[0].readAt).not.toBeNull()
  })

  it('내 게시물에 내가 좋아요 → 알림 없음, 소셜 알림 끄면 행만 생기고 푸시 없음', async () => {
    const a = await withToken('에이')
    const b = await consentedLogin(app, '비이')
    const [postId] = await seedPosts(prisma, a.userId, 1)
    await http()
      .put(`/api/v1/posts/${postId}/like`)
      .set(...bearer(a.accessToken))
      .expect(200)
    expect(await prisma.notification.count()).toBe(0)

    await prisma.user.update({ where: { id: a.userId }, data: { notifySocial: false } })
    await follow(b.accessToken, a.userId).expect(200)
    expect(await prisma.notification.count()).toBe(1)
    expect(push.sent()).toHaveLength(0)
  })

  it('차단한 상대가 만든 알림은 알림함·안 읽음 수에서 빠진다', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const c = await consentedLogin(app, '씨이')
    await follow(b.accessToken, a.userId).expect(200)
    await follow(c.accessToken, a.userId).expect(200)
    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    const list = await get(a.accessToken, '/notifications').expect(200)
    expect(list.body.items.map((n: { actor: { id: string } }) => n.actor.id)).toEqual([c.userId])
    expect((await get(a.accessToken, '/notifications/unread-count').expect(200)).body).toEqual({ count: 1 })
  })
})
