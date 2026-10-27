import type { DomainMatrix } from '.'

// 내보내기. 유예(UNLINKING) 중에도 허용되는 유일한 쓰기(@AllowDuringUnlinking). 커플 B의 jobId는 404
export const exportMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'POST /export', request: () => ({ path: '/export' }), expectsNotFound: false },
    { route: 'GET /export', request: () => ({ path: '/export' }), expectsNotFound: false },
    {
      route: 'GET /export/:jobId',
      request: ({ b }) => ({ path: `/export/${b.seeded.exportJobId}` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
