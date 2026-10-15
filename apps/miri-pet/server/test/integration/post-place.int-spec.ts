import type { INestApplication } from '@nestjs/common'
import type { PostPage } from '@miri-pet/shared'
import request from 'supertest'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createPet } from './factories'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createPlace } from './place-factories'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('게시물 장소 태그 POST /posts placeId · GET /places/:id/posts (실DB)', () => {
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

  const post = async (who: { accessToken: string; petId: string }, placeId?: string) => {
    const media = await uploadImage(app, prisma, memory, who.accessToken, 'POST')
    return http()
      .post('/api/v1/posts')
      .set(...bearer(who.accessToken))
      .send({ mediaIds: [media], petIds: [who.petId], ...(placeId ? { placeId } : {}) })
  }

  const placePosts = async (token: string, placeId: string, query = ''): Promise<PostPage> => {
    const res = await http()
      .get(`/api/v1/places/${placeId}/posts${query}`)
      .set(...bearer(token))
      .expect(200)
    return res.body
  }

  it('ACTIVE 장소를 태그하면 201 + place {id,name,category}, 상세에도 같은 값, 태그 없으면 null', async () => {
    const a = await author('에이')
    const place = await createPlace(prisma, { name: '숲길 테라스 카페', category: 'CAFE' })
    const res = await post(a, place.id)
    expect(res.status).toBe(201)
    expect(res.body.place).toEqual({ id: place.id, name: '숲길 테라스 카페', category: 'CAFE' })

    const detail = await http()
      .get(`/api/v1/posts/${res.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(200)
    expect(detail.body.place).toEqual(res.body.place)
    const untagged = await post(a)
    expect(untagged.status).toBe(201)
    expect(untagged.body.place).toBeNull()
  })

  it('숨김·폐업·없는 장소 태그 → 422 PLACE_NOT_USABLE, 게시물은 생기지 않는다', async () => {
    const a = await author('에이')
    const hidden = await createPlace(prisma, { status: 'HIDDEN' })
    const closed = await createPlace(prisma, { status: 'CLOSED' })
    for (const placeId of [hidden.id, closed.id, '0199e3a0-0000-7000-8000-0000000009ff']) {
      const res = await post(a, placeId)
      expect(res.status).toBe(422)
      expect(res.body.code).toBe('PLACE_NOT_USABLE')
    }
    expect(await prisma.post.count()).toBe(0)
  })

  it('태그 뒤 장소가 숨겨지면 게시물의 place는 null, 장소 게시물 목록은 404', async () => {
    const a = await author('에이')
    const place = await createPlace(prisma)
    const created = await post(a, place.id)
    await prisma.place.update({ where: { id: place.id }, data: { status: 'HIDDEN' } })
    const detail = await http()
      .get(`/api/v1/posts/${created.body.id}`)
      .set(...bearer(a.accessToken))
      .expect(200)
    expect(detail.body.place).toBeNull()
    await http()
      .get(`/api/v1/places/${place.id}/posts`)
      .set(...bearer(a.accessToken))
      .expect(404)
  })

  it('GET /places/:id/posts: 이 장소 태그 게시물만 최신순·커서, 차단·숨김·삭제·비활성 작성자 제외', async () => {
    const viewer = await author('보는이')
    const writer = await author('쓰는이')
    const blocked = await author('차단된이')
    const suspended = await author('정지된이')
    const place = await createPlace(prisma)
    const other = await createPlace(prisma)

    const visible: string[] = []
    for (let n = 0; n < 3; n += 1) visible.push((await post(writer, place.id)).body.id)
    visible.push((await post(viewer, place.id)).body.id)
    await post(writer, other.id)
    await post(writer)
    await post(blocked, place.id)
    await post(suspended, place.id)
    const hiddenPost = (await post(writer, place.id)).body.id
    const deletedPost = (await post(writer, place.id)).body.id
    await prisma.post.update({ where: { id: hiddenPost }, data: { hiddenAt: new Date() } })
    await prisma.post.update({ where: { id: deletedPost }, data: { deletedAt: new Date() } })
    await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })
    await http()
      .post(`/api/v1/blocks/${viewer.userId}`)
      .set(...bearer(blocked.accessToken))
      .expect(204)

    const first = await placePosts(viewer.accessToken, place.id, '?limit=3')
    expect(first.items.map((item) => item.id)).toEqual([visible[3], visible[2], visible[1]])
    expect(first.nextCursor).toBe(visible[1])
    expect(first.items[0]?.place).toEqual({ id: place.id, name: place.name, category: place.category })
    const second = await placePosts(viewer.accessToken, place.id, `?limit=3&cursor=${first.nextCursor}`)
    expect(second.items.map((item) => item.id)).toEqual([visible[0]])
    expect(second.nextCursor).toBeNull()
  })

  it('장소가 지워지면 게시물은 남고 placeId만 비워진다 (onDelete SetNull)', async () => {
    const a = await author('에이')
    const place = await createPlace(prisma)
    const created = await post(a, place.id)
    await prisma.place.delete({ where: { id: place.id } })
    const row = await prisma.post.findUniqueOrThrow({ where: { id: created.body.id } })
    expect(row.placeId).toBeNull()
  })

  it('잘못된 placeId 형식 → 400', async () => {
    const a = await author('에이')
    await http()
      .get('/api/v1/places/not-a-uuid/posts')
      .set(...bearer(a.accessToken))
      .expect(400)
    const res = await post(a, 'not-a-uuid')
    expect(res.status).toBe(400)
  })
})
