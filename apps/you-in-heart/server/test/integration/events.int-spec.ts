import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, tokenFor } from './auth-helpers'
import { createPairedCouple, createUser } from './factories'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

describe('POST /events (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const track = (token: string, body: object) =>
    request(app.getHttpServer())
      .post('/api/v1/events')
      .set(...bearer(token))
      .send(body)

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await truncateAll(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  it('미연결 사용자의 이벤트는 coupleId null로 남는다', async () => {
    const user = await createUser(prisma)
    await track(await tokenFor(app, user.id), { name: 'app_open', props: { screen: 'home' } }).expect(204)
    const rows = await prisma.eventLog.findMany()
    expect(rows.map(({ name, userId, coupleId, props }) => ({ name, userId, coupleId, props }))).toEqual([
      { name: 'app_open', userId: user.id, coupleId: null, props: { screen: 'home' } },
    ])
  })

  it('연결된 사용자는 서버가 찾은 자기 coupleId로 남고, 클라이언트가 보낸 coupleId는 무시한다', async () => {
    const mine = await createPairedCouple(prisma)
    const other = await createPairedCouple(prisma)
    const token = await tokenFor(app, mine.members[0].id)
    await track(token, { name: 'memory_viewed', coupleId: other.couple.id }).expect(204)
    const row = await prisma.eventLog.findFirstOrThrow()
    expect(row.coupleId).toBe(mine.couple.id)
    expect(row.props).toEqual({})
  })

  it('연결 해제 유예 중에도 이벤트는 받는다', async () => {
    const { members } = await createPairedCouple(prisma, {
      status: 'UNLINKING',
      purgeAfter: new Date(Date.now() + 1e9),
    })
    await track(await tokenFor(app, members[0].id), { name: 'app_open' }).expect(204)
  })

  it.each([
    ['금지 키(lat)', { name: 'app_open', props: { lat: 37.5 } }],
    ['금지 키(대소문자·공백 Body)', { name: 'app_open', props: { ' Body ': 'x' } }],
    ['중첩 객체', { name: 'app_open', props: { nested: { text: 'x' } } }],
    ['모르는 이름', { name: 'something' }],
    ['서버 전용 이름(invite_created)', { name: 'invite_created' }],
    ['서버 전용 이름(couple_paired)', { name: 'couple_paired' }],
  ])('%s는 400이고 저장하지 않는다', async (_label, body) => {
    const user = await createUser(prisma)
    await track(await tokenFor(app, user.id), body).expect(400)
    expect(await prisma.eventLog.count()).toBe(0)
  })

  it('토큰 없이 호출하면 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/events').send({ name: 'app_open' }).expect(401)
  })
})
