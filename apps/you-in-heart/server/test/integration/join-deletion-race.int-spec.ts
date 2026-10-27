import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { KakaoUnlinkClient } from '../../src/users/kakao-unlink.client'
import { bearer, tokenFor } from './auth-helpers'
import { createUser } from './factories'
import { createFakePush } from './fake-push'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

const ROUNDS = 8

// 초대 코드 주인이 탈퇴하는 순간 상대가 그 코드로 join해도 "멤버 1명짜리 커플"·"없는 사용자의 멤버"가 생기지 않는다
describe('join과 회원 탈퇴 경합 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(PUSH_SENDER)
        .useValue(createFakePush().sender)
        .overrideProvider(KakaoUnlinkClient)
        .useValue({ unlink: jest.fn().mockResolvedValue(undefined) })
        .overrideProvider(OBJECT_STORAGE)
        .useValue(new MemoryObjectStorage()),
    )
    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  const raceOnce = async () => {
    await truncateAll(prisma)
    const [creator, joiner] = await Promise.all([createUser(prisma), createUser(prisma)])
    const [creatorToken, joinerToken] = await Promise.all([tokenFor(app, creator.id), tokenFor(app, joiner.id)])
    const invite = await http()
      .post('/api/v1/couples/invites')
      .set(...bearer(creatorToken))
      .expect(201)

    const [joined, deleted] = await Promise.all([
      http()
        .post('/api/v1/couples/join')
        .set(...bearer(joinerToken))
        .send({ code: invite.body.code }),
      http()
        .delete('/api/v1/me')
        .set(...bearer(creatorToken)),
    ])
    const couples = await prisma.couple.findMany({ select: { status: true, _count: { select: { members: true } } } })
    const creatorRow = await prisma.user.findUnique({ where: { id: creator.id }, select: { status: true } })
    return { joinStatus: joined.status, deleteStatus: deleted.status, couples, creatorRow }
  }

  it(`${ROUNDS}회 동시 실행: 5xx 없음, 커플은 0개 또는 멤버 2명 + UNLINKING(탈퇴자 DELETED)`, async () => {
    const outcomes = await Array.from({ length: ROUNDS }).reduce<Promise<Awaited<ReturnType<typeof raceOnce>>[]>>(
      async (previous) => [...(await previous), await raceOnce()],
      Promise.resolve([]),
    )
    const broken = outcomes.filter(({ joinStatus, deleteStatus, couples, creatorRow }) => {
      if (deleteStatus !== 204 || joinStatus >= 500) return true
      if (couples.length === 0) return joinStatus !== 404 || creatorRow !== null
      const [couple] = couples
      return (
        couples.length !== 1 ||
        joinStatus !== 201 ||
        couple?._count.members !== 2 ||
        couple.status !== 'UNLINKING' ||
        creatorRow?.status !== 'DELETED'
      )
    })
    expect(broken).toEqual([])
  }, 60_000)
})
