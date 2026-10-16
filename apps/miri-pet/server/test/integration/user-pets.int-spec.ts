import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

// C1: 다른 사용자 프로필의 "반려동물" 탭 — GET /users/:id/pets
describe('GET /users/:id/pets (실DB)', () => {
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
  const listPets = (token: string, userId: string) =>
    http()
      .get(`/api/v1/users/${userId}/pets`)
      .set(...bearer(token))
  const createPet = (token: string, body: Record<string, unknown>) =>
    http()
      .post('/api/v1/pets')
      .set(...bearer(token))
      .send(body)
      .expect(201)

  it('공개 요약만 내려준다(생년만, 접종·증명서·정확한 생일 없음), 등록순', async () => {
    const owner = await consentedLogin(app, '보리맘')
    const viewer = await consentedLogin(app, '구경꾼')
    const avatar = await uploadImage(app, prisma, memory, owner.accessToken, 'AVATAR')
    const bori = await createPet(owner.accessToken, {
      name: '보리',
      species: 'DOG',
      size: 'S',
      breed: '말티즈',
      birthDate: '2021-05-02',
      avatarMediaId: avatar,
    })
    const nabi = await createPet(owner.accessToken, { name: '나비', species: 'CAT', size: 'M' })
    await http()
      .post(`/api/v1/pets/${bori.body.id}/vaccinations`)
      .set(...bearer(owner.accessToken))
      .send({ type: 'DHPPL', administeredOn: '2026-10-01' })
      .expect(201)

    const res = await listPets(viewer.accessToken, owner.userId).expect(200)

    expect(res.body).toEqual({
      items: [
        {
          id: bori.body.id,
          name: '보리',
          species: 'DOG',
          breed: '말티즈',
          size: 'S',
          birthYear: 2021,
          avatarUrl: `https://img.test/p/${avatar}/480.jpg`,
        },
        { id: nabi.body.id, name: '나비', species: 'CAT', breed: null, size: 'M', birthYear: null, avatarUrl: null },
      ],
    })
    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain('2021-05-02')
    expect(raw).not.toContain('birthDate')
    expect(raw).not.toContain('vaccination')
    expect(raw).not.toContain('certificate')
  })

  it('본인도 볼 수 있다, 펫이 없으면 빈 목록', async () => {
    const owner = await consentedLogin(app, '혼자')
    await expect(listPets(owner.accessToken, owner.userId).expect(200)).resolves.toMatchObject({
      body: { items: [] },
    })
  })

  it('차단(양방향)·정지·탈퇴·숨김·없는 사용자는 모두 같은 404', async () => {
    const viewer = await consentedLogin(app, '구경꾼')
    const blockedByMe = await consentedLogin(app, '내가차단')
    const blockedMe = await consentedLogin(app, '나를차단')
    const suspended = await consentedLogin(app, '정지됨')
    const deleted = await consentedLogin(app, '탈퇴함')
    const hidden = await consentedLogin(app, '숨김')
    await Promise.all(
      [blockedByMe, blockedMe, suspended, deleted, hidden].map((user) =>
        createPet(user.accessToken, { name: '펫', species: 'DOG', size: 'S' }),
      ),
    )
    await http()
      .post(`/api/v1/blocks/${blockedByMe.userId}`)
      .set(...bearer(viewer.accessToken))
      .expect((res) => expect([200, 201, 204]).toContain(res.status))
    await http()
      .post(`/api/v1/blocks/${viewer.userId}`)
      .set(...bearer(blockedMe.accessToken))
      .expect((res) => expect([200, 201, 204]).toContain(res.status))
    await prisma.user.update({ where: { id: suspended.userId }, data: { status: 'SUSPENDED' } })
    await prisma.user.update({ where: { id: deleted.userId }, data: { status: 'DELETED' } })
    await prisma.user.update({ where: { id: hidden.userId }, data: { hiddenAt: new Date() } })

    const targets = [blockedByMe, blockedMe, suspended, deleted, hidden].map((user) => user.userId)
    const responses = await Promise.all(
      [...targets, '0199e3a0-0000-7000-8000-000000000999'].map((id) => listPets(viewer.accessToken, id).expect(404)),
    )
    expect(new Set(responses.map((res) => res.body.message)).size).toBe(1)
  })

  it('id 형식 오류 400, 로그인하지 않으면 401', async () => {
    const viewer = await consentedLogin(app, '구경꾼')
    await listPets(viewer.accessToken, 'not-a-uuid').expect(400)
    await http().get(`/api/v1/users/${viewer.userId}/pets`).expect(401)
  })
})
