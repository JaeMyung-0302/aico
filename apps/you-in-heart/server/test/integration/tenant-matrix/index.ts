import type { SeededCouple } from '../factories'
import { couplesMatrix } from './couples.matrix'
import { eventsMatrix } from './events.matrix'
import { publicMatrix } from './public.matrix'
import { usersMatrix } from './users.matrix'

// 테넌트 매트릭스: 커플 데이터 라우트를 추가하는 Step은 tenant-matrix/<domain>.matrix.ts를 만들고 아래 MATRICES에 넣는다.
// tenant-isolation.int-spec이 라우트 전체를 자동 수집해 매트릭스와 대조한다(빠진 라우트 = 실패)

export type MemberFixture = { userId: string; token: string }
export type CoupleFixture = { coupleId: string; members: readonly [MemberFixture, MemberFixture]; seeded: SeededCouple }
// a: 호출하는 커플, b: 노려지는 커플(실제 id 제공), outsider: 커플 미연결 사용자
export type TenantFixture = { a: CoupleFixture; b: CoupleFixture; outsider: MemberFixture }

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type RouteName = `${HttpMethod} /${string}`

export type CoupleRouteCase = {
  route: RouteName
  // 커플 A 토큰으로 보낼 요청. :id 자리에는 fixture.b의 실제 id를 넣는다(/api/v1 제외 경로)
  request: (fixture: TenantFixture) => { path: string; body?: object }
  // true: B의 리소스를 가리키는 :id 라우트 → 반드시 404. false: 목록·내 커플 라우트 → B id 비노출 + B 무변경만 검사
  expectsNotFound: boolean
}

// @AllowWithoutCouple() 라우트도 이유와 함께 명시한다(데코레이터만 붙여 매트릭스를 우회하지 못하게)
export type WithoutCoupleRoute = { route: RouteName; reason: string }

export type DomainMatrix = {
  coupleRoutes: readonly CoupleRouteCase[]
  withoutCoupleRoutes: readonly WithoutCoupleRoute[]
}

const MATRICES: readonly DomainMatrix[] = [publicMatrix, usersMatrix, couplesMatrix, eventsMatrix]

export const COUPLE_ROUTE_CASES: readonly CoupleRouteCase[] = MATRICES.flatMap((matrix) => matrix.coupleRoutes)
export const WITHOUT_COUPLE_ROUTES: readonly WithoutCoupleRoute[] = MATRICES.flatMap(
  (matrix) => matrix.withoutCoupleRoutes,
)
