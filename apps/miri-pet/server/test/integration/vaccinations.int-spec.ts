import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { addDays, kstToday } from '../../src/vaccinations/kst-date'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('접종 기록 CRUD·D-day (실DB)', () => {
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

  const loginWithPet = async (nickname: string, petName = '보리') => {
    const me = await consentedLogin(app, nickname)
    const pet = await http()
      .post('/api/v1/pets')
      .set(...bearer(me.accessToken))
      .send({ name: petName, species: 'DOG', size: 'S' })
      .expect(201)
    return { ...me, petId: pet.body.id as string }
  }

  const addVaccination = (token: string, petId: string, body: Record<string, unknown>) =>
    http()
      .post(`/api/v1/pets/${petId}/vaccinations`)
      .set(...bearer(token))
      .send(body)

  it('기록을 만들고 펫별 목록(최근 접종일 순)으로 본다', async () => {
    const me = await loginWithPet('기록왕')
    const older = await addVaccination(me.accessToken, me.petId, { type: 'RABIES', administeredOn: '2026-03-02' })
    const newer = await addVaccination(me.accessToken, me.petId, {
      type: 'DHPPL',
      administeredOn: '2026-10-01',
      clinicName: '미리동물병원',
      nextDueOn: '2027-10-01',
    }).expect(201)
    expect(older.status).toBe(201)
    expect(newer.body).toEqual({
      id: expect.any(String),
      petId: me.petId,
      type: 'DHPPL',
      customName: null,
      administeredOn: '2026-10-01',
      clinicName: '미리동물병원',
      nextDueOn: '2027-10-01',
      certificateCount: 0,
    })

    const list = await http()
      .get(`/api/v1/pets/${me.petId}/vaccinations`)
      .set(...bearer(me.accessToken))
      .expect(200)
    expect(list.body.map((v: { type: string }) => v.type)).toEqual(['DHPPL', 'RABIES'])
  })

  it('직접 입력(ETC)은 이름이 필요하고, 다음 접종일이 접종일보다 빠르면 400', async () => {
    const me = await loginWithPet('검증')
    await addVaccination(me.accessToken, me.petId, { type: 'ETC', administeredOn: '2026-10-01' }).expect(400)
    await addVaccination(me.accessToken, me.petId, {
      type: 'DHPPL',
      administeredOn: '2026-10-01',
      nextDueOn: '2026-09-30',
    }).expect(400)
    await addVaccination(me.accessToken, me.petId, {
      type: 'ETC',
      customName: '파보 추가',
      administeredOn: '2026-10-01',
    }).expect(201)
  })

  it('수정 후 합친 값도 검증한다 (ETC로 바꾸면서 이름 없음 → 400, 다음 접종일 < 접종일 → 400)', async () => {
    const me = await loginWithPet('수정검증')
    const created = await addVaccination(me.accessToken, me.petId, {
      type: 'DHPPL',
      administeredOn: '2026-10-01',
    }).expect(201)
    const patch = (body: Record<string, unknown>) =>
      http()
        .patch(`/api/v1/vaccinations/${created.body.id}`)
        .set(...bearer(me.accessToken))
        .send(body)
    await patch({ type: 'ETC' }).expect(400)
    await patch({ nextDueOn: '2026-01-01' }).expect(400)
    const ok = await patch({ clinicName: '새병원', nextDueOn: '2027-10-01' }).expect(200)
    expect(ok.body).toMatchObject({ clinicName: '새병원', nextDueOn: '2027-10-01', type: 'DHPPL' })
  })

  it('다른 사람 펫의 기록은 목록·추가·수정·삭제 모두 404', async () => {
    const owner = await loginWithPet('주인')
    const other = await consentedLogin(app, '남의집')
    const created = await addVaccination(owner.accessToken, owner.petId, {
      type: 'DHPPL',
      administeredOn: '2026-10-01',
    }).expect(201)

    await http()
      .get(`/api/v1/pets/${owner.petId}/vaccinations`)
      .set(...bearer(other.accessToken))
      .expect(404)
    await addVaccination(other.accessToken, owner.petId, { type: 'DHPPL', administeredOn: '2026-10-01' }).expect(404)
    await http()
      .patch(`/api/v1/vaccinations/${created.body.id}`)
      .set(...bearer(other.accessToken))
      .send({ clinicName: 'x' })
      .expect(404)
    await http()
      .delete(`/api/v1/vaccinations/${created.body.id}`)
      .set(...bearer(other.accessToken))
      .expect(404)
    expect(await prisma.vaccination.count()).toBe(1)
  })

  describe('GET /vaccinations/upcoming (홈 D-day 배너)', () => {
    const today = kstToday(new Date())

    it('내 펫 전체에서 오늘 이후 가장 가까운 다음 접종 1건 + D-day', async () => {
      const me = await loginWithPet('배너', '보리')
      const dubu = await http()
        .post('/api/v1/pets')
        .set(...bearer(me.accessToken))
        .send({ name: '두부', species: 'CAT', size: 'S' })
        .expect(201)
      await addVaccination(me.accessToken, me.petId, {
        type: 'DHPPL',
        administeredOn: addDays(today, -30),
        nextDueOn: addDays(today, 7),
      }).expect(201)
      await addVaccination(me.accessToken, dubu.body.id, {
        type: 'RABIES',
        administeredOn: addDays(today, -30),
        nextDueOn: addDays(today, 1),
      }).expect(201)
      // 지난 날짜는 제외
      await addVaccination(me.accessToken, me.petId, {
        type: 'CORONA',
        administeredOn: addDays(today, -60),
        nextDueOn: addDays(today, -1),
      }).expect(201)

      const res = await http()
        .get('/api/v1/vaccinations/upcoming')
        .set(...bearer(me.accessToken))
        .expect(200)
      expect(res.body.item).toMatchObject({
        pet: { id: dubu.body.id, name: '두부' },
        dDay: 1,
        vaccination: { type: 'RABIES', nextDueOn: addDays(today, 1) },
      })
    })

    it('오늘이 접종일이면 D-0, 없으면 item null, 남의 기록은 보이지 않는다', async () => {
      const me = await loginWithPet('오늘')
      const other = await loginWithPet('남의펫')
      await addVaccination(other.accessToken, other.petId, {
        type: 'RABIES',
        administeredOn: addDays(today, -1),
        nextDueOn: addDays(today, 2),
      }).expect(201)

      const empty = await http()
        .get('/api/v1/vaccinations/upcoming')
        .set(...bearer(me.accessToken))
        .expect(200)
      expect(empty.body).toEqual({ item: null })

      await addVaccination(me.accessToken, me.petId, {
        type: 'DHPPL',
        administeredOn: addDays(today, -365),
        nextDueOn: today,
      }).expect(201)
      const res = await http()
        .get('/api/v1/vaccinations/upcoming')
        .set(...bearer(me.accessToken))
        .expect(200)
      expect(res.body.item.dDay).toBe(0)
    })
  })
})
