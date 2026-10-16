import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { truncateAll } from './truncate'

// Phase 4 체크포인트: 사용자 200명·게시물 1만 개 시드에서 GET /feed/home p95 < 300ms
const USERS = 200
const POSTS = 10_000
const FOLLOWING = 50
const CHUNK = 2_000
const P95_BUDGET_MS = 300

const chunks = <T>(items: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, index) => items.slice(index * CHUNK, (index + 1) * CHUNK))

const percentile = (samples: readonly number[], ratio: number): number => {
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0
}

describe('피드 성능 (시드 1만 게시물, 실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let restoreEnv: () => void
  let baseUrl: string

  beforeAll(async () => {
    // 부하 측정은 여러 클라이언트에서 온 요청으로 본다(프록시 뒤 cf-connecting-ip 기준 rate limit)
    restoreEnv = withEnv({ ENABLE_DEV_LOGIN: 'true', NODE_ENV: 'test', TRUST_PROXY_HOPS: '2' })
    app = await createTestApp()
    prisma = app.get(PrismaService)
    await truncateAll(prisma)
    // 동시 요청은 실제 포트로 보낸다(supertest가 요청마다 서버를 다시 listen하지 않게)
    await app.listen(0, '127.0.0.1')
    baseUrl = await app.getUrl()
  })

  afterAll(async () => {
    await truncateAll(prisma)
    await app.close()
    restoreEnv()
  })

  const seed = async (viewerId: string) => {
    const users = await prisma.user.createManyAndReturn({
      data: Array.from({ length: USERS }, (_, n) => ({ nickname: `seed_${n}` })),
      select: { id: true },
    })
    const pets = await prisma.pet.createManyAndReturn({
      data: users.map((user) => ({ ownerId: user.id, name: '시드', species: 'DOG' as const, size: 'M' as const })),
      select: { id: true, ownerId: true },
    })
    const authorOf = (n: number) => users[n % USERS]!.id
    for (const part of chunks(Array.from({ length: POSTS }, (_, n) => n))) {
      const media = await prisma.media.createManyAndReturn({
        data: part.map((n) => ({
          ownerId: authorOf(n),
          purpose: 'POST' as const,
          bucket: 'PUBLIC' as const,
          status: 'READY' as const,
          key: `p/seed-${n}/1440.jpg`,
          mime: 'image/jpeg',
          bytes: 1000,
        })),
        select: { id: true },
      })
      const posts = await prisma.post.createManyAndReturn({
        data: part.map((n) => ({ authorId: authorOf(n), caption: `seed ${n}` })),
        select: { id: true, authorId: true },
      })
      await prisma.postImage.createMany({
        data: posts.map((post, index) => ({ postId: post.id, mediaId: media[index]!.id, order: 0 })),
      })
      await prisma.postPet.createMany({
        data: posts.map((post) => ({ postId: post.id, petId: pets.find((pet) => pet.ownerId === post.authorId)!.id })),
      })
      await prisma.like.createMany({
        data: posts.filter((_, index) => index % 7 === 0).map((post) => ({ userId: viewerId, postId: post.id })),
      })
    }
    await prisma.follow.createMany({
      data: users.slice(0, FOLLOWING).map((user) => ({ followerId: viewerId, followeeId: user.id })),
    })
    await prisma.block.createMany({
      data: users.slice(FOLLOWING, FOLLOWING + 3).map((user) => ({ blockerId: viewerId, blockedId: user.id })),
    })
    await prisma.$executeRawUnsafe('ANALYZE')
  }

  const timeRequests = async (token: string, path: string, rounds: number, concurrency: number) => {
    const samples: number[] = []
    for (let round = 0; round < rounds; round += 1) {
      const batch = await Promise.all(
        Array.from({ length: concurrency }, async (_, slot) => {
          const started = process.hrtime.bigint()
          await request(baseUrl)
            .get(path)
            .set(...bearer(token))
            .set('cf-connecting-ip', `10.0.${round}.${slot + 1}`)
            .expect(200)
          return Number(process.hrtime.bigint() - started) / 1e6
        }),
      )
      samples.push(...batch)
    }
    return samples
  }

  it('GET /feed/home(첫 페이지·깊은 커서)과 /feed/explore p95 < 300ms', async () => {
    const viewer = await consentedLogin(app, '측정자')
    await seed(viewer.userId)
    expect(await prisma.post.count()).toBe(POSTS)

    const first = await request(app.getHttpServer())
      .get('/api/v1/feed/home?limit=20')
      .set(...bearer(viewer.accessToken))
      .expect(200)
    expect(first.body.items).toHaveLength(20)
    const deep = await prisma.post.findMany({
      where: {
        authorId: {
          in: (await prisma.follow.findMany({ where: { followerId: viewer.userId } })).map((f) => f.followeeId),
        },
      },
      orderBy: { id: 'desc' },
      skip: 2000,
      take: 1,
      select: { id: true },
    })

    await timeRequests(viewer.accessToken, '/api/v1/feed/home', 2, 5)
    const home = await timeRequests(viewer.accessToken, '/api/v1/feed/home', 10, 10)
    const deepHome = await timeRequests(viewer.accessToken, `/api/v1/feed/home?cursor=${deep[0]!.id}`, 5, 10)
    const explore = await timeRequests(viewer.accessToken, '/api/v1/feed/explore?excludeFollowing=true', 5, 10)
    const report = {
      homeP95: percentile(home, 0.95),
      homeP50: percentile(home, 0.5),
      deepHomeP95: percentile(deepHome, 0.95),
      exploreP95: percentile(explore, 0.95),
      samples: home.length + deepHome.length + explore.length,
    }
    process.stdout.write(`[feed-perf] ${JSON.stringify(report)}\n`)
    expect(report.homeP95).toBeLessThan(P95_BUDGET_MS)
    expect(report.deepHomeP95).toBeLessThan(P95_BUDGET_MS)
    expect(report.exploreP95).toBeLessThan(P95_BUDGET_MS)
  }, 180_000)
})
