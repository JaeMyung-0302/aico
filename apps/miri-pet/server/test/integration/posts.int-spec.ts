import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createPet } from './factories'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('게시물 POST/GET/DELETE /posts (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  const memory = createInMemoryStorage()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp((builder) => builder.overrideProvider(OBJECT_STORAGE).useValue(memory.storage))
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    memory.reset()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const http = () => request(app.getHttpServer())

  const author = async (nickname: string) => {
    const session = await consentedLogin(app, nickname)
    const pet = await createPet(prisma, session.userId, { name: '보리' })
    return { ...session, petId: pet.id }
  }

  const createPostReq = (token: string, body: object) =>
    http()
      .post('/api/v1/posts')
      .set(...bearer(token))
      .send(body)

  it('내 이미지 2장 + 내 펫 → 201, 이미지 URL·펫·작성자·카운터가 담긴다', async () => {
    const a = await author('에이')
    const media = [
      await uploadImage(app, prisma, memory, a.accessToken, 'POST'),
      await uploadImage(app, prisma, memory, a.accessToken, 'POST'),
    ]
    const res = await createPostReq(a.accessToken, { caption: ' 첫 산책 ', mediaIds: media, petIds: [a.petId] })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      author: { id: a.userId, nickname: '에이' },
      caption: '첫 산책',
      pets: [{ id: a.petId, name: '보리' }],
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    })
    expect(res.body.images).toEqual(
      media.map((id) => ({
        url: expect.stringMatching(new RegExp(`/p/${id}/1440\\.jpg$`)),
        thumbUrl: expect.stringMatching(new RegExp(`/p/${id}/480\\.jpg$`)),
      })),
    )
    const got = await http()
      .get(`/api/v1/posts/${res.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(200)
    expect(got.body.id).toBe(res.body.id)
  })

  it('다른 사람의 이미지로 게시 → 422 MEDIA_NOT_USABLE', async () => {
    const a = await author('에이')
    const b = await author('비이')
    const othersMedia = await uploadImage(app, prisma, memory, b.accessToken, 'POST')
    const res = await createPostReq(a.accessToken, { mediaIds: [othersMedia], petIds: [a.petId] })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('MEDIA_NOT_USABLE')
  })

  it('이미 다른 게시물에 붙은 이미지·AVATAR 용도 이미지 → 422', async () => {
    const a = await author('에이')
    const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
    await createPostReq(a.accessToken, { mediaIds: [media], petIds: [a.petId] }).expect(201)
    await createPostReq(a.accessToken, { mediaIds: [media], petIds: [a.petId] }).expect(422)
    const avatar = await uploadImage(app, prisma, memory, a.accessToken, 'AVATAR')
    await createPostReq(a.accessToken, { mediaIds: [avatar], petIds: [a.petId] }).expect(422)
  })

  it('같은 이미지로 동시에 게시 → 하나만 201, 나머지 422 MEDIA_NOT_USABLE (PostImage.mediaId 유니크)', async () => {
    const a = await author('에이')
    const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
    const results = await Promise.all(
      Array.from({ length: 2 }, () => createPostReq(a.accessToken, { mediaIds: [media], petIds: [a.petId] })),
    )
    expect(results.map((res) => res.status).sort()).toEqual([201, 422])
    expect(results.find((res) => res.status === 422)?.body.code).toBe('MEDIA_NOT_USABLE')
    expect(await prisma.post.count()).toBe(1)
    expect(await prisma.postImage.count({ where: { mediaId: media } })).toBe(1)
  })

  it('DB 제약: 한 이미지는 한 게시물에만 붙는다(PostImage.mediaId 유니크)', async () => {
    const a = await author('에이')
    const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
    const [first, second] = await Promise.all(
      [0, 1].map(() => prisma.post.create({ data: { authorId: a.userId }, select: { id: true } })),
    )
    await prisma.postImage.create({ data: { postId: first!.id, mediaId: media, order: 0 } })
    await expect(
      prisma.postImage.create({ data: { postId: second!.id, mediaId: media, order: 0 } }),
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('펫 태그는 MAX_PETS_PER_POST(5)마리까지 → 6마리 400', async () => {
    const a = await author('에이')
    const fake = (n: number) => `0199e3a0-0000-7000-8000-0000000002${String(n).padStart(2, '0')}`
    await createPostReq(a.accessToken, {
      mediaIds: [fake(99)],
      petIds: Array.from({ length: 6 }, (_, n) => fake(n)),
    }).expect(400)
  })

  it('이미지 11장·0장, 펫 0마리, 같은 이미지 중복 → 400(요청 검증)', async () => {
    const a = await author('에이')
    const fake = (n: number) => `0199e3a0-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`
    await createPostReq(a.accessToken, {
      mediaIds: Array.from({ length: 11 }, (_, n) => fake(n)),
      petIds: [a.petId],
    }).expect(400)
    await createPostReq(a.accessToken, { mediaIds: [], petIds: [a.petId] }).expect(400)
    await createPostReq(a.accessToken, { mediaIds: [fake(1)], petIds: [] }).expect(400)
    await createPostReq(a.accessToken, { mediaIds: [fake(1), fake(1)], petIds: [a.petId] }).expect(400)
  })

  it('다른 사람의 펫을 태그 → 422', async () => {
    const a = await author('에이')
    const b = await author('비이')
    const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
    const res = await createPostReq(a.accessToken, { mediaIds: [media], petIds: [b.petId] })
    expect(res.status).toBe(422)
    expect(await prisma.post.count()).toBe(0)
  })

  it('차단 관계면 양방향 모두 GET /posts/:id 404, 숨김·삭제 게시물도 404', async () => {
    const a = await author('에이')
    const b = await author('비이')
    const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
    const post = await createPostReq(a.accessToken, { mediaIds: [media], petIds: [a.petId] }).expect(201)
    await http()
      .get(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(b.accessToken))
      .expect(200)

    await http()
      .post(`/api/v1/blocks/${a.userId}`)
      .set(...bearer(b.accessToken))
      .expect(204)
    await http()
      .get(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(b.accessToken))
      .expect(404)
    await http()
      .delete(`/api/v1/blocks/${a.userId}`)
      .set(...bearer(b.accessToken))
      .expect(204)
    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    await http()
      .get(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(b.accessToken))
      .expect(404)

    await prisma.post.update({ where: { id: post.body.id }, data: { hiddenAt: new Date() } })
    await http()
      .get(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(404)
  })

  it('DELETE: 남의 게시물 404, 내 게시물 204 → 이후 404 + 이미지 R2 삭제', async () => {
    const a = await author('에이')
    const b = await author('비이')
    const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
    const post = await createPostReq(a.accessToken, { mediaIds: [media], petIds: [a.petId] }).expect(201)
    await http()
      .delete(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(b.accessToken))
      .expect(404)
    await http()
      .delete(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    await http()
      .get(`/api/v1/posts/${post.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(404)
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.body.id } })).deletedAt).not.toBeNull()
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${media}/1440.jpg` })).toBe(false)
    expect(await prisma.media.count({ where: { id: media } })).toBe(0)
  })

  it('GET /users/:id/posts: 프로필 그리드(최신순), 차단 관계면 404', async () => {
    const a = await author('에이')
    const b = await author('비이')
    const ids: string[] = []
    for (let n = 0; n < 3; n += 1) {
      const media = await uploadImage(app, prisma, memory, a.accessToken, 'POST')
      const post = await createPostReq(a.accessToken, { mediaIds: [media], petIds: [a.petId] }).expect(201)
      ids.push(post.body.id)
    }
    const res = await http()
      .get(`/api/v1/users/${a.userId}/posts?limit=2`)
      .set(...bearer(b.accessToken))
      .expect(200)
    expect(res.body.items.map((p: { id: string }) => p.id)).toEqual([ids[2], ids[1]])
    expect(res.body.nextCursor).toBe(ids[1])

    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)
    await http()
      .get(`/api/v1/users/${a.userId}/posts`)
      .set(...bearer(b.accessToken))
      .expect(404)
  })
})
