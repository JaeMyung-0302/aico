import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('PATCH /me 프로필 사진 (실DB, 보안 리뷰 L4·M1)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  const memory = createInMemoryStorage()

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', R2_PUBLIC_BASE_URL: 'https://img.test' })
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

  const patchMe = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(...bearer(token))
      .send(body)

  it('L4: 아직 complete되지 않은(PENDING) 사진이나 AVATAR 용도가 아닌 사진은 422 MEDIA_NOT_USABLE', async () => {
    const me = await consentedLogin(app, '대기중')
    const presign = await request(app.getHttpServer())
      .post('/api/v1/media/uploads')
      .set(...bearer(me.accessToken))
      .send({ purpose: 'AVATAR', mime: 'image/jpeg', bytes: 10 })
      .expect(201)
    const pending = await patchMe(me.accessToken, { avatarMediaId: presign.body.mediaId }).expect(422)
    expect(pending.body.code).toBe('MEDIA_NOT_USABLE')

    const postImage = await uploadImage(app, prisma, memory, me.accessToken, 'POST')
    const wrongPurpose = await patchMe(me.accessToken, { avatarMediaId: postImage }).expect(422)
    expect(wrongPurpose.body.code).toBe('MEDIA_NOT_USABLE')
  })

  it('M1: 프로필 사진을 바꾸면 이전 사진 행·R2 객체를 지우고, 해제해도 지운다', async () => {
    const me = await consentedLogin(app, '교체')
    const first = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    const second = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')

    await patchMe(me.accessToken, { avatarMediaId: first }).expect(200)
    const replaced = await patchMe(me.accessToken, { avatarMediaId: second }).expect(200)
    expect(replaced.body.avatarUrl).toContain(second)
    expect(await prisma.media.findUnique({ where: { id: first } })).toBeNull()
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${first}/1440.jpg` })).toBe(false)
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${first}/480.jpg` })).toBe(false)

    await patchMe(me.accessToken, { avatarMediaId: null }).expect(200)
    expect(await prisma.media.findUnique({ where: { id: second } })).toBeNull()
    expect(memory.keys()).toEqual([])
  })

  it('M1: 이전 사진이 펫 프로필로도 쓰이면 지우지 않는다', async () => {
    const me = await consentedLogin(app, '같이씀')
    const shared = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    const next = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    await patchMe(me.accessToken, { avatarMediaId: shared }).expect(200)
    // API로는 더 이상 공유할 수 없다(QA1 P1) → 과거 데이터처럼 DB에 직접 만든다
    await prisma.pet.create({
      data: { ownerId: me.userId, name: '보리', species: 'DOG', size: 'S', avatarMediaId: shared },
    })

    await patchMe(me.accessToken, { avatarMediaId: next }).expect(200)

    expect(await prisma.media.findUnique({ where: { id: shared } })).not.toBeNull()
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${shared}/1440.jpg` })).toBe(true)
  })

  const postPet = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/pets')
      .set(...bearer(token))
      .send({ name: '보리', species: 'DOG', size: 'S', ...body })

  it('QA1 P1: 펫 프로필 사진으로 쓰인 사진을 내 프로필로 지정하면 409 AVATAR_IN_USE', async () => {
    const me = await consentedLogin(app, '펫먼저')
    const photo = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    await postPet(me.accessToken, { avatarMediaId: photo }).expect(201)

    const res = await patchMe(me.accessToken, { avatarMediaId: photo }).expect(409)
    expect(res.body.code).toBe('AVATAR_IN_USE')
  })

  it('QA1 P1: 내 프로필 사진을 펫 등록·수정에 쓰면 409 AVATAR_IN_USE', async () => {
    const me = await consentedLogin(app, '나먼저')
    const photo = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    await patchMe(me.accessToken, { avatarMediaId: photo }).expect(200)

    const created = await postPet(me.accessToken, { avatarMediaId: photo }).expect(409)
    expect(created.body.code).toBe('AVATAR_IN_USE')

    const pet = await postPet(me.accessToken, {}).expect(201)
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/pets/${pet.body.id}`)
      .set(...bearer(me.accessToken))
      .send({ avatarMediaId: photo })
      .expect(409)
    expect(updated.body.code).toBe('AVATAR_IN_USE')
  })

  it('QA1 P1: 펫을 지워도 내 프로필 사진으로도 쓰이는 사진(과거 데이터)은 지우지 않는다', async () => {
    const me = await consentedLogin(app, '펫삭제')
    const shared = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    await patchMe(me.accessToken, { avatarMediaId: shared }).expect(200)
    const pet = await prisma.pet.create({
      data: { ownerId: me.userId, name: '보리', species: 'DOG', size: 'S', avatarMediaId: shared },
    })

    await request(app.getHttpServer())
      .delete(`/api/v1/pets/${pet.id}`)
      .set(...bearer(me.accessToken))
      .expect(204)

    expect(await prisma.media.findUnique({ where: { id: shared } })).not.toBeNull()
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${shared}/1440.jpg` })).toBe(true)
    const meRes = await request(app.getHttpServer()).get('/api/v1/me').set(...bearer(me.accessToken)).expect(200)
    expect(meRes.body.avatarUrl).toContain(shared)
  })
})
