import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const PET = { name: '보리', species: 'DOG', size: 'S' }

describe('펫 CRUD (실DB)', () => {
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

  const http = () => request(app.getHttpServer())
  const createPet = (token: string, body: Record<string, unknown> = PET) =>
    http()
      .post('/api/v1/pets')
      .set(...bearer(token))
      .send(body)

  it('펫을 만들고 내 목록에서 본다 (생일은 YYYY-MM-DD)', async () => {
    const me = await consentedLogin(app, '보리맘')
    const created = await createPet(me.accessToken, { ...PET, breed: '말티즈', birthDate: '2021-05-02' }).expect(201)
    expect(created.body).toEqual({
      id: expect.any(String),
      name: '보리',
      species: 'DOG',
      breed: '말티즈',
      birthDate: '2021-05-02',
      size: 'S',
      avatarUrl: null,
    })

    const list = await http()
      .get('/api/v1/pets')
      .set(...bearer(me.accessToken))
      .expect(200)
    expect(list.body).toEqual([created.body])
  })

  it('5마리까지 만들 수 있고 6번째는 422', async () => {
    const me = await consentedLogin(app, '다둥이')
    for (const name of ['하나', '두리', '세찌', '네찌', '다섯']) {
      await createPet(me.accessToken, { ...PET, name }).expect(201)
    }
    const sixth = await createPet(me.accessToken, { ...PET, name: '여섯' }).expect(422)
    expect(sixth.body.code).toBe('PET_LIMIT_EXCEEDED')
    expect(await prisma.pet.count({ where: { ownerId: me.userId } })).toBe(5)
  })

  it('동시에 6마리를 만들어도 5마리까지만 저장된다', async () => {
    const me = await consentedLogin(app, '동시요청')
    const results = await Promise.all(
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((name) => createPet(me.accessToken, { ...PET, name })),
    )
    expect(results.map((r) => r.status).sort()).toEqual([201, 201, 201, 201, 201, 422])
    expect(await prisma.pet.count({ where: { ownerId: me.userId } })).toBe(5)
  })

  it('필수값(이름·종·크기)이 없으면 400', async () => {
    const me = await consentedLogin(app, '빈칸')
    await createPet(me.accessToken, { name: '', species: 'DOG', size: 'S' }).expect(400)
    await createPet(me.accessToken, { name: '보리', size: 'S' }).expect(400)
    await createPet(me.accessToken, { name: '보리', species: 'DOG' }).expect(400)
  })

  it('다른 사람 펫은 조회·수정·삭제가 404 (존재를 드러내지 않는다)', async () => {
    const owner = await consentedLogin(app, '주인')
    const other = await consentedLogin(app, '남의집')
    const pet = (await createPet(owner.accessToken).expect(201)).body

    await http()
      .get(`/api/v1/pets/${pet.id}`)
      .set(...bearer(other.accessToken))
      .expect(404)
    await http()
      .patch(`/api/v1/pets/${pet.id}`)
      .set(...bearer(other.accessToken))
      .send({ name: '해킹' })
      .expect(404)
    await http()
      .delete(`/api/v1/pets/${pet.id}`)
      .set(...bearer(other.accessToken))
      .expect(404)
    expect((await prisma.pet.findUniqueOrThrow({ where: { id: pet.id } })).name).toBe('보리')
  })

  it('소유자는 수정·삭제할 수 있다', async () => {
    const me = await consentedLogin(app, '수정왕')
    const pet = (await createPet(me.accessToken).expect(201)).body
    const updated = await http()
      .patch(`/api/v1/pets/${pet.id}`)
      .set(...bearer(me.accessToken))
      .send({ name: '보리보리', size: 'M', birthDate: null })
      .expect(200)
    expect(updated.body).toMatchObject({ name: '보리보리', size: 'M', birthDate: null })

    await http()
      .delete(`/api/v1/pets/${pet.id}`)
      .set(...bearer(me.accessToken))
      .expect(204)
    expect(await prisma.pet.count()).toBe(0)
  })

  it('프로필 사진: 내 READY 이미지만 쓸 수 있고 공개 URL(480 썸네일)로 내려준다', async () => {
    const me = await consentedLogin(app, '사진')
    const other = await consentedLogin(app, '남사진')
    const mine = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    const theirs = await uploadImage(app, prisma, memory, other.accessToken, 'AVATAR')

    const created = await createPet(me.accessToken, { ...PET, avatarMediaId: mine }).expect(201)
    expect(created.body.avatarUrl).toBe(`https://img.test/p/${mine}/480.jpg`)

    const rejected = await createPet(me.accessToken, { ...PET, avatarMediaId: theirs }).expect(422)
    expect(rejected.body.code).toBe('MEDIA_NOT_USABLE')
  })

  it('증명서(비공개) 이미지는 펫 프로필 사진으로 쓸 수 없다', async () => {
    const me = await consentedLogin(app, '비공개')
    const certificate = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
    await createPet(me.accessToken, { ...PET, avatarMediaId: certificate }).expect(422)
  })

  it('펫을 지우면 접종·증명서 행과 증명서 R2 객체도 지운다', async () => {
    const me = await consentedLogin(app, '정리')
    const pet = (await createPet(me.accessToken).expect(201)).body
    const certificate = await uploadImage(app, prisma, memory, me.accessToken, 'CERTIFICATE')
    await http()
      .post(`/api/v1/pets/${pet.id}/vaccinations`)
      .set(...bearer(me.accessToken))
      .send({ type: 'RABIES', administeredOn: '2026-10-01', certificateMediaIds: [certificate] })
      .expect(201)
    const media = await prisma.media.findUniqueOrThrow({ where: { id: certificate } })
    expect(memory.has({ bucket: 'PRIVATE', key: media.key })).toBe(true)

    await http()
      .delete(`/api/v1/pets/${pet.id}`)
      .set(...bearer(me.accessToken))
      .expect(204)

    expect(await prisma.vaccination.count()).toBe(0)
    expect(await prisma.vaccinationCertificate.count()).toBe(0)
    expect(await prisma.media.count({ where: { id: certificate } })).toBe(0)
    expect(memory.has({ bucket: 'PRIVATE', key: media.key })).toBe(false)
  })

  it('로그인하지 않으면 401', async () => {
    await http().get('/api/v1/pets').expect(401)
  })

  it('L4: 이미 다른 펫이 쓰는 사진을 프로필로 지정하면 500이 아니라 409 AVATAR_IN_USE', async () => {
    const me = await consentedLogin(app, '두마리')
    const avatar = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    const first = (await createPet(me.accessToken, { ...PET, avatarMediaId: avatar }).expect(201)).body
    const second = (await createPet(me.accessToken, { ...PET, name: '나비' }).expect(201)).body

    const created = await createPet(me.accessToken, { ...PET, name: '콩이', avatarMediaId: avatar }).expect(409)
    expect(created.body.code).toBe('AVATAR_IN_USE')
    const updated = await http()
      .patch(`/api/v1/pets/${second.id}`)
      .set(...bearer(me.accessToken))
      .send({ avatarMediaId: avatar })
      .expect(409)
    expect(updated.body.code).toBe('AVATAR_IN_USE')
    expect((await prisma.pet.findUniqueOrThrow({ where: { id: first.id } })).avatarMediaId).toBe(avatar)
  })

  it('M1: 펫 프로필 사진을 바꾸거나 지우면 이전 사진의 Media 행·R2 객체(1440·480)를 지운다', async () => {
    const me = await consentedLogin(app, '사진교체')
    const before = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    const after = await uploadImage(app, prisma, memory, me.accessToken, 'AVATAR')
    const pet = (await createPet(me.accessToken, { ...PET, avatarMediaId: before }).expect(201)).body
    const patch = (body: Record<string, unknown>) =>
      http()
        .patch(`/api/v1/pets/${pet.id}`)
        .set(...bearer(me.accessToken))
        .send(body)
        .expect(200)

    await patch({ avatarMediaId: after })
    expect(await prisma.media.findUnique({ where: { id: before } })).toBeNull()
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${before}/1440.jpg` })).toBe(false)
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${before}/480.jpg` })).toBe(false)

    await patch({ name: '이름만' })
    expect(await prisma.media.findUnique({ where: { id: after } })).not.toBeNull()

    await patch({ avatarMediaId: null })
    expect(await prisma.media.findUnique({ where: { id: after } })).toBeNull()
    expect(memory.has({ bucket: 'PUBLIC', key: `p/${after}/1440.jpg` })).toBe(false)
  })
})
