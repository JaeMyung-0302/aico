import type { INestApplication } from '@nestjs/common'
import type { FeedPage } from '@miri-pet/shared'
import request from 'supertest'
import { PrismaService } from '../../src/prisma/prisma.service'
import { bearer, consentedLogin, withEnv } from './auth-helpers'
import { createTestApp } from './setup-app'
import { seedPosts } from './social-helpers'
import { truncateAll } from './truncate'

describe('피드 GET /feed/home·/feed/explore (실DB)', () => {
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

  const getFeed = async (token: string, path: string): Promise<FeedPage> => {
    const res = await http()
      .get(`/api/v1/feed/${path}`)
      .set(...bearer(token))
      .expect(200)
    return res.body
  }

  const readAll = async (token: string, path: string, query = ''): Promise<FeedPage[]> => {
    const pages: FeedPage[] = []
    let cursor: string | null = null
    do {
      const page: FeedPage = await getFeed(token, `${path}?limit=20${query}${cursor ? `&cursor=${cursor}` : ''}`)
      pages.push(page)
      cursor = page.nextCursor
    } while (cursor && pages.length < 10)
    return pages
  }

  const follow = (token: string, userId: string) =>
    http()
      .put(`/api/v1/users/${userId}/follow`)
      .set(...bearer(token))
      .expect(200)

  const ids = (pages: FeedPage[]) => pages.flatMap((page) => page.items.map((item) => item.id))

  it('팔로잉 게시물 45개를 20개씩 3페이지 → 중복 0·누락 0, id 내림차순, 마지막 페이지에 fallback', async () => {
    const viewer = await consentedLogin(app, '보는이')
    const writer = await consentedLogin(app, '쓰는이')
    const posted = await seedPosts(prisma, writer.userId, 45)
    await follow(viewer.accessToken, writer.userId)

    const pages = await readAll(viewer.accessToken, 'home')
    expect(pages.map((page) => page.items.length)).toEqual([20, 20, 5])
    const seen = ids(pages)
    expect(new Set(seen).size).toBe(45)
    expect([...seen].sort()).toEqual([...posted].sort())
    expect(seen).toEqual([...posted].reverse())
    expect(pages[0]?.fallback).toBeUndefined()
    expect(pages[1]?.fallback).toBeUndefined()
    expect(pages[2]).toMatchObject({ nextCursor: null, fallback: 'explore' })
  })

  it('fallback 뒤 explore(excludeFollowing)는 홈에서 본 게시물 없이 나머지 전체를 이어 준다', async () => {
    const viewer = await consentedLogin(app, '보는이')
    const friend = await consentedLogin(app, '친구')
    const stranger = await consentedLogin(app, '낯선이')
    const mine = await seedPosts(prisma, viewer.userId, 2)
    const friends = await seedPosts(prisma, friend.userId, 3)
    const strangers = await seedPosts(prisma, stranger.userId, 25)
    await follow(viewer.accessToken, friend.userId)

    const home = await readAll(viewer.accessToken, 'home')
    expect(home).toHaveLength(1)
    expect(home[0]?.fallback).toBe('explore')
    expect(ids(home).sort()).toEqual([...mine, ...friends].sort())

    const explore = await readAll(viewer.accessToken, 'explore', '&excludeFollowing=true')
    expect(explore.map((page) => page.items.length)).toEqual([20, 5])
    expect(ids(explore)).toEqual([...strangers].reverse())
    expect(explore.every((page) => page.fallback === undefined)).toBe(true)

    const everyone = await readAll(viewer.accessToken, 'explore')
    expect(new Set(ids(everyone)).size).toBe(30)
  })

  it('팔로잉 0명·내 게시물 0개 → 첫 응답부터 fallback explore', async () => {
    const viewer = await consentedLogin(app, '새사람')
    const page = await getFeed(viewer.accessToken, 'home')
    expect(page).toEqual({ items: [], nextCursor: null, fallback: 'explore' })
  })

  it('차단 작성자는 양방향으로 홈·탐색에서 빠진다', async () => {
    const a = await consentedLogin(app, '에이')
    const b = await consentedLogin(app, '비이')
    const aPosts = await seedPosts(prisma, a.userId, 2)
    const bPosts = await seedPosts(prisma, b.userId, 2)
    await follow(a.accessToken, b.userId)
    await follow(b.accessToken, a.userId)
    expect(ids(await readAll(a.accessToken, 'home'))).toHaveLength(4)

    await http()
      .post(`/api/v1/blocks/${b.userId}`)
      .set(...bearer(a.accessToken))
      .expect(204)

    const aHome = ids(await readAll(a.accessToken, 'home'))
    const aExplore = ids(await readAll(a.accessToken, 'explore'))
    const bHome = ids(await readAll(b.accessToken, 'home'))
    const bExplore = ids(await readAll(b.accessToken, 'explore'))
    expect(aHome.sort()).toEqual([...aPosts].sort())
    expect(aExplore.some((id) => bPosts.includes(id))).toBe(false)
    expect(bHome.sort()).toEqual([...bPosts].sort())
    expect(bExplore.some((id) => aPosts.includes(id))).toBe(false)
  })

  it('숨김·삭제 게시물, 정지·탈퇴·신고숨김 작성자는 피드에서 빠진다', async () => {
    const viewer = await consentedLogin(app, '보는이')
    const writer = await consentedLogin(app, '쓰는이')
    const visible = await seedPosts(prisma, writer.userId, 1)
    await seedPosts(prisma, writer.userId, 1, { hiddenAt: new Date() })
    await seedPosts(prisma, writer.userId, 1, { deletedAt: new Date() })
    await follow(viewer.accessToken, writer.userId)
    expect(ids(await readAll(viewer.accessToken, 'home'))).toEqual(visible)

    await prisma.user.update({ where: { id: writer.userId }, data: { status: 'SUSPENDED' } })
    expect(ids(await readAll(viewer.accessToken, 'home'))).toEqual([])
    expect(ids(await readAll(viewer.accessToken, 'explore'))).toEqual([])
    await prisma.user.update({ where: { id: writer.userId }, data: { status: 'ACTIVE', hiddenAt: new Date() } })
    expect(ids(await readAll(viewer.accessToken, 'explore'))).toEqual([])
  })

  it('isLiked는 페이지 단위로 내 좋아요를 반영한다', async () => {
    const viewer = await consentedLogin(app, '보는이')
    const writer = await consentedLogin(app, '쓰는이')
    const [first, second] = await seedPosts(prisma, writer.userId, 2)
    await http()
      .put(`/api/v1/posts/${first}/like`)
      .set(...bearer(viewer.accessToken))
      .expect(200)
    const page = await getFeed(viewer.accessToken, 'explore')
    const byId = new Map(page.items.map((item) => [item.id, item]))
    expect(byId.get(first!)).toMatchObject({ isLiked: true, likeCount: 1 })
    expect(byId.get(second!)).toMatchObject({ isLiked: false, likeCount: 0 })
  })

  it('잘못된 커서 → 400', async () => {
    const viewer = await consentedLogin(app, '보는이')
    await http()
      .get('/api/v1/feed/home?cursor=nope')
      .set(...bearer(viewer.accessToken))
      .expect(400)
  })
})
