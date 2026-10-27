import type { INestApplication } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import request from 'supertest'
import { PUSH_SENDER } from '../../src/notifications/push.service'
import { KakaoLocalClient } from '../../src/places/kakao-local.client'
import { PrismaService } from '../../src/prisma/prisma.service'
import { MemoryObjectStorage } from '../../src/storage/memory-object-storage'
import { OBJECT_STORAGE } from '../../src/storage/object-storage'
import { bearer, tokenFor } from './auth-helpers'
import { snapshotCouple } from './couple-tables'
import { createPairedCouple, createUser, grantRequiredConsents, seedCoupleData } from './factories'
import { createFakeKakaoLocal } from './fake-kakao-local'
import { createFakePush } from './fake-push'
import { collectRoutes, type RouteInfo } from './route-inventory'
import { createTestApp } from './setup-app'
import {
  COUPLE_ROUTE_CASES,
  type CoupleFixture,
  type CoupleRouteCase,
  type TenantFixture,
  WITHOUT_COUPLE_ROUTES,
} from './tenant-matrix'
import { truncateAll } from './truncate'

const API = '/api/v1'

const send = (app: INestApplication, routeCase: CoupleRouteCase, fixture: TenantFixture, token: string) => {
  const [method] = routeCase.route.split(' ')
  const { path, body } = routeCase.request(fixture)
  const server = request(app.getHttpServer())
  const url = `${API}${path}`
  const req =
    method === 'GET'
      ? server.get(url)
      : method === 'POST'
        ? server.post(url)
        : method === 'PATCH'
          ? server.patch(url)
          : method === 'PUT'
            ? server.put(url)
            : server.delete(url)
  return req.set(...bearer(token)).send(body ?? {})
}

const idsOf = (fixture: CoupleFixture): string[] => [
  fixture.coupleId,
  ...fixture.members.map((member) => member.userId),
  ...Object.values(fixture.seeded),
]

describe('테넌트 격리 (실DB)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let routes: RouteInfo[]

  const createCoupleFixture = async (): Promise<CoupleFixture> => {
    const paired = await createPairedCouple(prisma)
    const seeded = await seedCoupleData(prisma, paired)
    await grantRequiredConsents(
      prisma,
      paired.members.map((member) => member.id),
    )
    // 좌표 라우트(@RequiresLocationConsent)도 테넌트 404까지 닿게 위치 동의를 준다(동의 게이트 자체는 각 도메인 spec이 검사)
    await prisma.consent.createMany({
      data: paired.members.map((member) => ({ userId: member.id, kind: 'LOCATION' as const, version: 'test' })),
    })
    const tokens = await Promise.all(paired.members.map((member) => tokenFor(app, member.id)))
    return {
      coupleId: paired.couple.id,
      members: [
        { userId: paired.members[0].id, token: tokens[0] ?? '' },
        { userId: paired.members[1].id, token: tokens[1] ?? '' },
      ],
      seeded,
    }
  }

  const createFixture = async (): Promise<TenantFixture> => {
    await truncateAll(prisma)
    const [a, b] = [await createCoupleFixture(), await createCoupleFixture()]
    const outsider = await createUser(prisma)
    return { a, b, outsider: { userId: outsider.id, token: await tokenFor(app, outsider.id) } }
  }

  beforeAll(async () => {
    // 해제 라우트가 R2 원장을 쓴다 → 메모리 스토리지. 장소 검색은 카카오 대역
    app = await createTestApp(
      (builder) =>
        builder
          .overrideProvider(PUSH_SENDER)
          .useValue(createFakePush().sender)
          .overrideProvider(OBJECT_STORAGE)
          .useValue(new MemoryObjectStorage())
          .overrideProvider(KakaoLocalClient)
          .useValue(createFakeKakaoLocal()),
      { imports: [DiscoveryModule] },
    )
    prisma = app.get(PrismaService)
    routes = collectRoutes(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('@AllowWithoutCouple가 아닌 모든 라우트가 테넌트 매트릭스에 있다', () => {
    const coupleRoutes = routes.filter((route) => !route.isWithoutCouple).map((route) => route.route)
    const withoutRoutes = routes.filter((route) => route.isWithoutCouple).map((route) => route.route)
    const caseNames: string[] = COUPLE_ROUTE_CASES.map((routeCase) => routeCase.route)
    const declaredWithout: string[] = WITHOUT_COUPLE_ROUTES.map((route) => route.route)

    process.stdout.write(`routes checked: ${coupleRoutes.length}\n${coupleRoutes.map((r) => `  - ${r}`).join('\n')}\n`)

    expect({ missingFromMatrix: coupleRoutes.filter((route) => !caseNames.includes(route)) }).toEqual({
      missingFromMatrix: [],
    })
    expect({ notCoupleRoute: caseNames.filter((route) => !coupleRoutes.includes(route)) }).toEqual({
      notCoupleRoute: [],
    })
    expect({ undeclaredWithoutCouple: withoutRoutes.filter((route) => !declaredWithout.includes(route)) }).toEqual({
      undeclaredWithoutCouple: [],
    })
    expect({ staleWithoutCouple: declaredWithout.filter((route) => !withoutRoutes.includes(route)) }).toEqual({
      staleWithoutCouple: [],
    })
    expect(coupleRoutes.length).toBeGreaterThan(0)
  })

  const cases = COUPLE_ROUTE_CASES.map((routeCase) => [routeCase.route, routeCase] as const)

  it.each(cases)(
    '%s: 커플 A 토큰 + 커플 B의 실제 id → B 비노출·B 무변경(:id 라우트는 404)',
    async (_name, routeCase) => {
      const fixture = await createFixture()
      const before = await snapshotCouple(prisma, fixture.b.coupleId)
      const res = await send(app, routeCase, fixture, fixture.a.members[0].token)

      expect(res.status).toBeLessThan(500)
      if (routeCase.expectsNotFound) expect(res.status).toBe(404)
      const text = JSON.stringify(res.body)
      expect(idsOf(fixture.b).filter((id) => text.includes(id))).toEqual([])
      expect(await snapshotCouple(prisma, fixture.b.coupleId)).toBe(before)
    },
  )

  it.each(cases)('%s: 커플 미연결 사용자는 403', async (_name, routeCase) => {
    const fixture = await createFixture()
    const before = await snapshotCouple(prisma, fixture.b.coupleId)
    const res = await send(app, routeCase, fixture, fixture.outsider.token)
    expect(res.status).toBe(403)
    expect(await snapshotCouple(prisma, fixture.b.coupleId)).toBe(before)
  })

  it.each(cases)('%s: 필수 동의가 없는 커플 멤버는 403 CONSENT_REQUIRED·무변경', async (_name, routeCase) => {
    const fixture = await createFixture()
    await prisma.consent.deleteMany({ where: { userId: fixture.a.members[0].userId } })
    const before = await snapshotCouple(prisma, fixture.a.coupleId)
    const res = await send(app, routeCase, fixture, fixture.a.members[0].token)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('CONSENT_REQUIRED')
    expect(await snapshotCouple(prisma, fixture.a.coupleId)).toBe(before)
  })

  it.each(cases)('%s: 토큰 없이 호출하면 401', async (_name, routeCase) => {
    const fixture = await createFixture()
    const res = await send(app, routeCase, fixture, '')
    expect(res.status).toBe(401)
  })
})
