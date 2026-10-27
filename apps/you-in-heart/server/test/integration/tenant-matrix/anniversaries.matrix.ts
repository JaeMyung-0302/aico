import type { DomainMatrix } from '.'

// 커스텀 기념일 CRUD. 자동 기념일(100일·N주년)은 Couple.startedOn에서 계산하므로 저장 행이 없다
export const anniversariesMatrix: DomainMatrix = {
  coupleRoutes: [
    {
      route: 'GET /anniversaries',
      request: () => ({ path: '/anniversaries?from=2025-01-01&to=2026-12-31' }),
      expectsNotFound: false,
    },
    { route: 'GET /anniversaries/custom', request: () => ({ path: '/anniversaries/custom' }), expectsNotFound: false },
    {
      route: 'POST /anniversaries',
      request: () => ({ path: '/anniversaries', body: { title: '첫 만남', date: '2025-04-01' } }),
      expectsNotFound: false,
    },
    {
      route: 'PATCH /anniversaries/:id',
      request: ({ b }) => ({ path: `/anniversaries/${b.seeded.anniversaryId}`, body: { title: '바꿈' } }),
      expectsNotFound: true,
    },
    {
      route: 'DELETE /anniversaries/:id',
      request: ({ b }) => ({ path: `/anniversaries/${b.seeded.anniversaryId}` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
