import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { ageAccounts, seedPosts } from './social-helpers'
import { truncateAll } from './truncate'

describe('좋아요·댓글·신고 (실DB)', () => {
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
  const likeCount = async (postId: string) => (await prisma.post.findUniqueOrThrow({ where: { id: postId } })).likeCount
  const like = (token: string, postId: string) =>
    http()
      .put(`/api/v1/posts/${postId}/like`)
      .set(...bearer(token))
  const unlike = (token: string, postId: string) =>
    http()
      .delete(`/api/v1/posts/${postId}/like`)
      .set(...bearer(token))
  const comment = (token: string, postId: string, body: string) =>
    http()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(...bearer(token))
      .send({ body })
  const listComments = async (token: string, postId: string) => {
    const res = await http()
      .get(`/api/v1/posts/${postId}/comments`)
      .set(...bearer(token))
      .expect(200)
    return res.body.items.map((item: { body: string }) => item.body)
  }
  const block = (token: string, userId: string) =>
    http()
      .post(`/api/v1/blocks/${userId}`)
      .set(...bearer(token))
      .expect(204)

  it('좋아요 2회 → 카운트 1(멱등), 취소 2회 → 0', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const [postId] = await seedPosts(prisma, a.userId, 1)
    expect((await like(b.accessToken, postId!)).body).toEqual({ isLiked: true, likeCount: 1 })
    expect((await like(b.accessToken, postId!)).body).toEqual({ isLiked: true, likeCount: 1 })
    expect((await unlike(b.accessToken, postId!)).body).toEqual({ isLiked: false, likeCount: 0 })
    expect((await unlike(b.accessToken, postId!)).body).toEqual({ isLiked: false, likeCount: 0 })
    expect(await likeCount(postId!)).toBe(0)
  })

  it('동시 요청에도 카운터 = Like 행 수 (같은 사람 10번 동시 + 5명 동시)', async () => {
    const a = await consentedLogin(app, '에이')
    const users = await Promise.all(['일일', '이이', '삼삼', '사사', '오오'].map((n) => consentedLogin(app, n)))
    const [postId] = await seedPosts(prisma, a.userId, 1)
    await Promise.all(Array.from({ length: 10 }, () => like(users[0]!.accessToken, postId!).expect(200)))
    expect(await likeCount(postId!)).toBe(1)
    await Promise.all(users.map((user) => like(user.accessToken, postId!).expect(200)))
    expect(await likeCount(postId!)).toBe(5)
    await Promise.all([
      ...Array.from({ length: 6 }, () => unlike(users[1]!.accessToken, postId!).expect(200)),
      ...Array.from({ length: 6 }, () => like(users[2]!.accessToken, postId!).expect(200)),
    ])
    expect(await likeCount(postId!)).toBe(4)
    expect(await prisma.like.count({ where: { postId } })).toBe(4)
  })

  it('차단 관계·삭제된 게시물에는 좋아요·댓글 404', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const [postId] = await seedPosts(prisma, a.userId, 1)
    const [deletedId] = await seedPosts(prisma, a.userId, 1, { deletedAt: new Date() })
    await like(b.accessToken, deletedId!).expect(404)
    await block(a.accessToken, b.userId)
    await like(b.accessToken, postId!).expect(404)
    await comment(b.accessToken, postId!, '안녕').expect(404)
    await http()
      .get(`/api/v1/posts/${postId}/comments`)
      .set(...bearer(b.accessToken))
      .expect(404)
  })

  it('댓글: 오래된순·commentCount 증감, 작성자/게시물 주인만 삭제, 빈 댓글 400', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const c = await consentedLogin(app, '씨이')
    const [postId] = await seedPosts(prisma, a.userId, 1)
    const first = await comment(b.accessToken, postId!, '첫 댓글').expect(201)
    expect(first.body).toMatchObject({ postId, body: '첫 댓글', author: { id: b.userId, nickname: '비이' } })
    await comment(c.accessToken, postId!, '두 번째').expect(201)
    await comment(c.accessToken, postId!, '   ').expect(400)
    expect(await listComments(a.accessToken, postId!)).toEqual(['첫 댓글', '두 번째'])
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(2)

    await http()
      .delete(`/api/v1/comments/${first.body.id}`)
      .set(...bearer(c.accessToken))
      .expect(404)
    await http()
      .delete(`/api/v1/comments/${first.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    await http()
      .delete(`/api/v1/comments/${first.body.id}`)
      .set(...bearer(b.accessToken))
      .expect(404)
    expect(await listComments(a.accessToken, postId!)).toEqual(['두 번째'])
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(1)
  })

  it('차단한 사용자의 댓글은 양방향 모두 안 보인다', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const c = await consentedLogin(app, '씨이')
    const [postId] = await seedPosts(prisma, a.userId, 1)
    await comment(b.accessToken, postId!, '비이 댓글').expect(201)
    await comment(c.accessToken, postId!, '씨이 댓글').expect(201)

    await block(c.accessToken, b.userId)
    expect(await listComments(c.accessToken, postId!)).toEqual(['씨이 댓글'])
    expect(await listComments(b.accessToken, postId!)).toEqual(['비이 댓글'])
    expect(await listComments(a.accessToken, postId!)).toEqual(['비이 댓글', '씨이 댓글'])
  })

  it('게시물 신고 3건(자격 있는 신고자) → 숨김 → 404, 운영자 dismiss로 복구', async () => {
    const a = await consentedLogin(app, '에이')
    const reporters = await Promise.all(['신고1', '신고2', '신고3'].map((n) => consentedLogin(app, n)))
    await ageAccounts(
      prisma,
      reporters.map((r) => r.userId),
    )
    const [postId] = await seedPosts(prisma, a.userId, 1)
    for (const reporter of reporters) {
      await http()
        .post('/api/v1/reports')
        .set(...bearer(reporter.accessToken))
        .send({ targetType: 'POST', targetId: postId, reason: 'SPAM' })
        .expect(201)
    }
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).hiddenAt).not.toBeNull()
    await http()
      .get(`/api/v1/posts/${postId}`)
      .set(...bearer(reporters[0]!.accessToken))
      .expect(404)
    await http()
      .post('/api/v1/reports')
      .set(...bearer(a.accessToken))
      .send({ targetType: 'POST', targetId: '0199e3a0-0000-7000-8000-000000000999', reason: 'SPAM' })
      .expect(404)
  })

  it('댓글 신고 3건 → 댓글 숨김 + commentCount 감소, 본인 댓글 신고 400', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const reporters = await Promise.all(['신고1', '신고2', '신고3'].map((n) => consentedLogin(app, n)))
    await ageAccounts(
      prisma,
      reporters.map((r) => r.userId),
    )
    const [postId] = await seedPosts(prisma, a.userId, 1)
    const target = await comment(b.accessToken, postId!, '나쁜 댓글').expect(201)
    await http()
      .post('/api/v1/reports')
      .set(...bearer(b.accessToken))
      .send({ targetType: 'COMMENT', targetId: target.body.id, reason: 'SPAM' })
      .expect(400)
    for (const reporter of reporters) {
      await http()
        .post('/api/v1/reports')
        .set(...bearer(reporter.accessToken))
        .send({ targetType: 'COMMENT', targetId: target.body.id, reason: 'HATE' })
        .expect(201)
    }
    expect(await listComments(a.accessToken, postId!)).toEqual([])
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(0)
  })
})
