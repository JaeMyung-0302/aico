import type { DomainMatrix } from '.'

// 지도 핀. :id 라우트는 커플 B의 실제 placeId로 404. search·reverse는 커플 데이터를 읽지 않지만 커플 라우트라 함께 검사한다
// (tenant-isolation은 카카오 대역을 쓰고, 모든 멤버에게 위치 동의를 준다)
export const placesMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /places', request: () => ({ path: '/places' }), expectsNotFound: false },
    { route: 'GET /places/search', request: () => ({ path: '/places/search?q=cafe' }), expectsNotFound: false },
    {
      route: 'GET /places/reverse',
      request: () => ({ path: '/places/reverse?lat=37.5&lng=127' }),
      expectsNotFound: false,
    },
    {
      route: 'POST /places',
      request: () => ({ path: '/places', body: { name: '여기', lat: 37.5, lng: 127 } }),
      expectsNotFound: false,
    },
    { route: 'GET /places/:id', request: ({ b }) => ({ path: `/places/${b.seeded.placeId}` }), expectsNotFound: true },
    {
      route: 'PATCH /places/:id',
      request: ({ b }) => ({ path: `/places/${b.seeded.placeId}`, body: { name: '탈취' } }),
      expectsNotFound: true,
    },
    {
      route: 'DELETE /places/:id',
      request: ({ b }) => ({ path: `/places/${b.seeded.placeId}` }),
      expectsNotFound: true,
    },
    {
      route: 'GET /places/:id/entries',
      request: ({ b }) => ({ path: `/places/${b.seeded.placeId}/entries` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
