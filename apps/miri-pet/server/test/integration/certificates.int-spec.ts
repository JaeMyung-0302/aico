import type { INestApplication } from '@nestjs/common'
import sharp from 'sharp'
import request from 'supertest'
import { OBJECT_STORAGE } from '../../src/media/object-storage'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, devLogin, REQUIRED_CONSENTS, withEnv } from './auth-helpers'
import { createInMemoryStorage, uploadImage } from './media-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('접종 증명서 열람 (실DB)', () => {
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

  // 소유자 + 펫 + 증명서 1장이 붙은 접종 기록
  const setupVaccination = async () => {
    const owner = await consentedLogin(app, '증명서주인')
    const pet = await http()
      .post('/api/v1/pets')
      .set(...bearer(owner.accessToken))
      .send({ name: '보리', species: 'DOG', size: 'S' })
      .expect(201)
    const mediaId = await uploadImage(app, prisma, memory, owner.accessToken, 'CERTIFICATE')
    const vaccination = await http()
      .post(`/api/v1/pets/${pet.body.id}/vaccinations`)
      .set(...bearer(owner.accessToken))
      .send({ type: 'DHPPL', administeredOn: '2026-10-01', nextDueOn: '2027-10-01', certificateMediaIds: [mediaId] })
      .expect(201)
    return { owner, petId: pet.body.id, mediaId, vaccinationId: vaccination.body.id }
  }

  it('소유자는 60초 presigned GET URL을 받고 접근 로그가 1행 남는다', async () => {
    const { owner, mediaId, vaccinationId } = await setupVaccination()

    const res = await http()
      .get(`/api/v1/vaccinations/${vaccinationId}/certificates`)
      .set(...bearer(owner.accessToken))
      .expect(200)

    expect(res.body).toEqual([{ mediaId, url: expect.any(String), expiresAt: expect.any(String) }])
    const url = new URL(res.body[0].url)
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60')
    expect(url.pathname).toContain(`/c/${owner.userId}/${mediaId}.jpg`)
    expect(url.hostname.startsWith('miripet-private.')).toBe(true)
    const expiresIn = new Date(res.body[0].expiresAt).getTime() - Date.now()
    expect(expiresIn).toBeGreaterThan(50_000)
    expect(expiresIn).toBeLessThanOrEqual(60_000)

    const logs = await prisma.mediaAccessLog.findMany()
    expect(logs).toEqual([expect.objectContaining({ userId: owner.userId, mediaId })])
  })

  it('다른 사용자는 403이고 URL·접근 로그가 생기지 않는다', async () => {
    const { vaccinationId } = await setupVaccination()
    const stranger = await consentedLogin(app, '낯선사람')
    memory.storage.presignGet.mockClear()

    await http()
      .get(`/api/v1/vaccinations/${vaccinationId}/certificates`)
      .set(...bearer(stranger.accessToken))
      .expect(403)

    expect(memory.storage.presignGet).not.toHaveBeenCalled()
    expect(await prisma.mediaAccessLog.count()).toBe(0)
  })

  it('증명서 별도 동의(CERTIFICATE)가 없으면 증명서 업로드 presign이 403, 동의하면 가능 (중복 동의는 1행)', async () => {
    const me = await devLogin(app, '동의안함')
    await http()
      .post('/api/v1/me/consents')
      .set(...bearer(me.accessToken))
      .send({ isAge14OrOlder: true, consents: REQUIRED_CONSENTS.filter((c) => c.kind !== 'CERTIFICATE') })
      .expect(204)
    const presign = () =>
      http()
        .post('/api/v1/media/uploads')
        .set(...bearer(me.accessToken))
        .send({ purpose: 'CERTIFICATE', mime: 'image/jpeg', bytes: 100 })

    const denied = await presign().expect(403)
    expect(denied.body.code).toBe('CERTIFICATE_CONSENT_REQUIRED')

    const agree = () =>
      http()
        .post('/api/v1/vaccinations/certificate-consent')
        .set(...bearer(me.accessToken))
        .send({ version: '2026-10-01' })
        .expect(204)
    await agree()
    await agree()
    expect(await prisma.consent.count({ where: { userId: me.userId, kind: 'CERTIFICATE' } })).toBe(1)
    await presign().expect(201)
  })

  it('없는 접종 기록은 404', async () => {
    const me = await consentedLogin(app, '없음')
    await http()
      .get('/api/v1/vaccinations/0199e3a0-0000-7000-8000-000000000000/certificates')
      .set(...bearer(me.accessToken))
      .expect(404)
  })

  it('저장된 증명서는 private c/ 경로에만 있고 EXIF·GPS가 없으며 incoming 원본은 지워진다', async () => {
    const { owner, mediaId } = await setupVaccination()
    const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } })
    expect(media).toMatchObject({
      bucket: 'PRIVATE',
      status: 'READY',
      key: `c/${owner.userId}/${mediaId}.jpg`,
      mime: 'image/jpeg',
    })
    const stored = memory.read({ bucket: 'PRIVATE', key: media.key })
    expect(stored).not.toBeNull()
    const meta = await sharp(stored ?? Buffer.alloc(0)).metadata()
    expect(meta.exif).toBeUndefined()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1440)
    expect(memory.keys().filter((id) => id.includes('incoming/'))).toEqual([])
    expect(memory.keys().filter((id) => id.startsWith('PUBLIC:'))).toEqual([])
  })

  it('다른 사람의 증명서 이미지를 내 접종 기록에 붙일 수 없다 (422)', async () => {
    const { mediaId } = await setupVaccination()
    const thief = await consentedLogin(app, '도둑')
    const pet = await http()
      .post('/api/v1/pets')
      .set(...bearer(thief.accessToken))
      .send({ name: '나비', species: 'CAT', size: 'S' })
      .expect(201)
    await http()
      .post(`/api/v1/pets/${pet.body.id}/vaccinations`)
      .set(...bearer(thief.accessToken))
      .send({ type: 'RABIES', administeredOn: '2026-10-01', certificateMediaIds: [mediaId] })
      .expect(422)
  })

  it('공개용(AVATAR) 이미지는 증명서로 붙일 수 없다 (422)', async () => {
    const { owner, petId } = await setupVaccination()
    const avatar = await uploadImage(app, prisma, memory, owner.accessToken, 'AVATAR')
    await http()
      .post(`/api/v1/pets/${petId}/vaccinations`)
      .set(...bearer(owner.accessToken))
      .send({ type: 'RABIES', administeredOn: '2026-10-01', certificateMediaIds: [avatar] })
      .expect(422)
  })

  it('이미 다른 기록에 붙은 증명서는 다시 붙일 수 없다 (422)', async () => {
    const { owner, petId, mediaId } = await setupVaccination()
    await http()
      .post(`/api/v1/pets/${petId}/vaccinations`)
      .set(...bearer(owner.accessToken))
      .send({ type: 'RABIES', administeredOn: '2026-10-02', certificateMediaIds: [mediaId] })
      .expect(422)
  })

  describe('보안 리뷰 후속 (L2·L3)', () => {
    it('L3: 증명서 URL 응답은 Cache-Control: no-store', async () => {
      const { owner, vaccinationId } = await setupVaccination()
      const res = await http()
        .get(`/api/v1/vaccinations/${vaccinationId}/certificates`)
        .set(...bearer(owner.accessToken))
        .expect(200)
      expect(res.headers['cache-control']).toBe('no-store')
    })

    it('L2: 현재 버전(CERTIFICATE_CONSENT_VERSION)이 아닌 동의는 400', async () => {
      const me = await consentedLogin(app, '옛버전')
      await http()
        .post('/api/v1/vaccinations/certificate-consent')
        .set(...bearer(me.accessToken))
        .send({ version: '1999-01-01' })
        .expect(400)
    })

    it('L2: DELETE certificate-consent → 동의 철회 + 내 증명서 사진(붙은 것·안 붙은 것) DB·R2 삭제, 접종 기록은 유지', async () => {
      const { owner, vaccinationId, mediaId } = await setupVaccination()
      const loose = await uploadImage(app, prisma, memory, owner.accessToken, 'CERTIFICATE')
      const avatar = await uploadImage(app, prisma, memory, owner.accessToken, 'AVATAR')
      const other = await setupOtherCertificate()

      const res = await http()
        .delete('/api/v1/vaccinations/certificate-consent')
        .set(...bearer(owner.accessToken))
        .expect(200)

      expect(res.body).toEqual({ withdrawnAt: expect.any(String), deletedCertificateCount: 2 })
      const consents = await prisma.consent.findMany({ where: { userId: owner.userId, kind: 'CERTIFICATE' } })
      expect(consents.length).toBeGreaterThan(0)
      expect(consents.every((consent) => consent.withdrawnAt !== null)).toBe(true)
      expect(await prisma.media.count({ where: { id: { in: [mediaId, loose] } } })).toBe(0)
      expect(await prisma.media.count({ where: { id: { in: [avatar, other] } } })).toBe(2)
      expect(memory.keys().filter((id) => id.startsWith(`PRIVATE:c/${owner.userId}/`))).toEqual([])
      const vaccination = await prisma.vaccination.findUniqueOrThrow({
        where: { id: vaccinationId },
        include: { _count: { select: { certificates: true } } },
      })
      expect(vaccination._count.certificates).toBe(0)

      const presign = await http()
        .post('/api/v1/media/uploads')
        .set(...bearer(owner.accessToken))
        .send({ purpose: 'CERTIFICATE', mime: 'image/jpeg', bytes: 100 })
        .expect(403)
      expect(presign.body.code).toBe('CERTIFICATE_CONSENT_REQUIRED')
    })

    // 다른 사용자의 증명서는 건드리지 않는지 확인용
    const setupOtherCertificate = async (): Promise<string> => {
      const other = await consentedLogin(app, '이웃')
      return uploadImage(app, prisma, memory, other.accessToken, 'CERTIFICATE')
    }
  })
})
