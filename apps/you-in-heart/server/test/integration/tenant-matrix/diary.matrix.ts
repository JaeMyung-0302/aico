import type { DomainMatrix } from '.'

// 일기. :id 라우트는 커플 B의 실제 entryId로 404여야 한다(작성자 검사 403보다 테넌트 404가 먼저)
export const diaryMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /diary', request: () => ({ path: '/diary' }), expectsNotFound: false },
    {
      route: 'POST /diary',
      request: () => ({ path: '/diary', body: { happenedOn: '2026-10-01', body: '오늘' } }),
      expectsNotFound: false,
    },
    {
      route: 'POST /diary/auto-days',
      request: () => ({ path: '/diary/auto-days', body: { dates: ['2026-10-01'] } }),
      expectsNotFound: false,
    },
    { route: 'GET /diary/:id', request: ({ b }) => ({ path: `/diary/${b.seeded.entryId}` }), expectsNotFound: true },
    {
      route: 'PATCH /diary/:id',
      request: ({ b }) => ({ path: `/diary/${b.seeded.entryId}`, body: { body: '탈취' } }),
      expectsNotFound: true,
    },
    {
      route: 'DELETE /diary/:id',
      request: ({ b }) => ({ path: `/diary/${b.seeded.entryId}` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
