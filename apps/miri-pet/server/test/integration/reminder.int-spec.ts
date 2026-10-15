import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER, type PushMessage } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { VaccinationReminderService } from '../../src/vaccinations/vaccination-reminder.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

// KST 2026-10-13 10:00 → D-1 대상 10-14, D-7 대상 10-20
const NOW = new Date('2026-10-13T01:00:00Z')
const NEXT_DAY = new Date('2026-10-14T01:00:00Z')
const TOKEN = 'ExponentPushToken[reminder-device]'

describe('접종 리마인더 (실DB, Expo mock)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let reminders: VaccinationReminderService
  let restoreEnv: () => void
  const sender = {
    send: jest.fn(async (messages: PushMessage[]) => messages.map((_, i) => ({ status: 'ok' as const, id: `r${i}` }))),
    getReceipts: jest.fn(async () => ({})),
  }

  beforeAll(async () => {
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test' })
    app = await createTestApp((builder) => builder.overrideProvider(PUSH_SENDER).useValue(sender))
    prisma = app.get(PrismaService)
    reminders = app.get(VaccinationReminderService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
    sender.send.mockClear()
  })

  afterAll(async () => {
    await app.close()
    restoreEnv()
  })

  const http = () => request(app.getHttpServer())
  const sentMessages = () => sender.send.mock.calls.flatMap(([messages]) => messages)

  // 로그인 + 푸시 토큰 등록 + 펫 + 다음 접종일이 nextDueOn인 기록
  const setup = async (nextDueOn: string) => {
    const me = await consentedLogin(app, '알림받기')
    await http()
      .put('/api/v1/push-tokens')
      .set(...bearer(me.accessToken))
      .send({ expoToken: TOKEN, platform: 'android' })
      .expect(204)
    const pet = await http()
      .post('/api/v1/pets')
      .set(...bearer(me.accessToken))
      .send({ name: '보리', species: 'DOG', size: 'S' })
      .expect(201)
    const vaccination = await http()
      .post(`/api/v1/pets/${pet.body.id}/vaccinations`)
      .set(...bearer(me.accessToken))
      .send({ type: 'DHPPL', administeredOn: '2025-10-14', nextDueOn })
      .expect(201)
    return { me, petId: pet.body.id, vaccinationId: vaccination.body.id }
  }

  it('같은 날 2번 실행해도 발송은 1건', async () => {
    await setup('2026-10-14')

    await expect(reminders.runOnce(NOW)).resolves.toMatchObject({ candidates: 1, sent: 1, skipped: 0 })
    await expect(reminders.runOnce(NOW)).resolves.toMatchObject({ candidates: 1, sent: 0, skipped: 1 })

    expect(sentMessages()).toEqual([
      expect.objectContaining({ to: TOKEN, title: '내일 접종일이에요', body: expect.stringContaining('보리') }),
    ])
    expect(await prisma.notificationLog.count()).toBe(1)
  })

  it('D-7과 D-1에 각각 1건씩 보낸다', async () => {
    await setup('2026-10-20')
    await reminders.runOnce(NOW)
    await reminders.runOnce(new Date('2026-10-19T01:00:00Z'))
    expect(sentMessages().map((m) => m.title)).toEqual(['접종 7일 전이에요', '내일 접종일이에요'])
  })

  it('nextDueOn을 수정하면 다음 실행이 새 날짜를 기준으로 집계한다', async () => {
    const { me, vaccinationId } = await setup('2026-10-14')
    await reminders.runOnce(NOW)
    expect(sentMessages()).toHaveLength(1)

    // 10-15로 미룬다 → 10-14 실행(KST)에서 D-1 대상이 된다
    await http()
      .patch(`/api/v1/vaccinations/${vaccinationId}`)
      .set(...bearer(me.accessToken))
      .send({ nextDueOn: '2026-10-15' })
      .expect(200)
    await expect(reminders.runOnce(NEXT_DAY)).resolves.toMatchObject({ sent: 1 })
    expect(sentMessages()).toHaveLength(2)
    expect(sentMessages()[1]?.body).toContain('10월 15일')
  })

  it('펫을 삭제하면 0건', async () => {
    const { me, petId } = await setup('2026-10-14')
    await http()
      .delete(`/api/v1/pets/${petId}`)
      .set(...bearer(me.accessToken))
      .expect(204)
    await expect(reminders.runOnce(NOW)).resolves.toMatchObject({ candidates: 0, sent: 0 })
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('접종 기록을 삭제하면 0건', async () => {
    const { me, vaccinationId } = await setup('2026-10-14')
    await http()
      .delete(`/api/v1/vaccinations/${vaccinationId}`)
      .set(...bearer(me.accessToken))
      .expect(204)
    await expect(reminders.runOnce(NOW)).resolves.toMatchObject({ candidates: 0, sent: 0 })
  })

  it('접종 알림 토글이 꺼져 있으면 0건', async () => {
    const { me } = await setup('2026-10-14')
    await http()
      .patch('/api/v1/me')
      .set(...bearer(me.accessToken))
      .send({ notifyVaccination: false })
      .expect(200)
    await expect(reminders.runOnce(NOW)).resolves.toMatchObject({ candidates: 0, sent: 0 })
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('대상 날짜가 아니면(D-3) 보내지 않는다', async () => {
    await setup('2026-10-16')
    await expect(reminders.runOnce(NOW)).resolves.toMatchObject({ candidates: 0 })
  })
})
