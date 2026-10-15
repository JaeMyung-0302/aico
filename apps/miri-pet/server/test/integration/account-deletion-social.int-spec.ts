import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { KakaoUnlinkClient } from '../../src/users/kakao-unlink.client'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { seedPosts } from './social-helpers'
import { truncateAll } from './truncate'

describe('DELETE /me — 게시물·댓글·알림 파기 (Phase 4, 실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp((builder) =>
      builder.overrideProvider(KakaoUnlinkClient).useValue({ unlink: jest.fn().mockResolvedValue(undefined) }),
    )
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

  it('내 게시물·댓글을 하드 삭제하고 남의 게시물 commentCount를 다시 맞추며, 나에게/내가 만든 알림을 지운다', async () => {
    const me = await consentedLogin(app, '탈퇴자')
    const other = await consentedLogin(app, '남는이')
    const third = await consentedLogin(app, '셋째')
    const myPosts = await seedPosts(prisma, me.userId, 2)
    const [otherPost] = await seedPosts(prisma, other.userId, 1)
    const comment = (token: string, postId: string, body: string) =>
      http()
        .post(`/api/v1/posts/${postId}/comments`)
        .set(...bearer(token))
        .send({ body })
        .expect(201)
    await comment(me.accessToken, otherPost!, '내 댓글 1')
    await comment(me.accessToken, otherPost!, '내 댓글 2')
    await comment(third.accessToken, otherPost!, '셋째 댓글')
    await comment(other.accessToken, myPosts[0]!, '내 글에 단 남의 댓글')
    await http()
      .put(`/api/v1/users/${me.userId}/follow`)
      .set(...bearer(other.accessToken))
      .expect(200)
    await http()
      .put(`/api/v1/posts/${otherPost}/like`)
      .set(...bearer(third.accessToken))
      .expect(200)
    expect(await prisma.notification.count()).toBe(6)

    await http()
      .delete('/api/v1/me')
      .set(...bearer(me.accessToken))
      .expect(204)

    expect(await prisma.post.count({ where: { authorId: me.userId } })).toBe(0)
    expect(await prisma.comment.count({ where: { authorId: me.userId } })).toBe(0)
    expect(await prisma.comment.count({ where: { postId: { in: myPosts } } })).toBe(0)
    expect((await prisma.post.findUniqueOrThrow({ where: { id: otherPost } })).commentCount).toBe(1)
    expect(await prisma.notification.count({ where: { OR: [{ userId: me.userId }, { actorId: me.userId }] } })).toBe(0)
    // 탈퇴와 무관한 셋째 → 남는이 댓글·좋아요 알림은 남는다
    expect(await prisma.notification.count()).toBe(2)
    const comments = await http()
      .get(`/api/v1/posts/${otherPost}/comments`)
      .set(...bearer(other.accessToken))
      .expect(200)
    expect(comments.body.items.map((c: { body: string }) => c.body)).toEqual(['셋째 댓글'])
  })
})
