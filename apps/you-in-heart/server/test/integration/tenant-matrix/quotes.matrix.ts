import type { DomainMatrix } from '.'

// 문구 보관함. :id 라우트는 커플 B의 실제 quoteId로 404(screenshot/complete는 B 객체를 건드리지 않음 — quotes.int-spec)
export const quotesMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /quotes', request: () => ({ path: '/quotes' }), expectsNotFound: false },
    {
      route: 'POST /quotes',
      request: () => ({ path: '/quotes', body: { source: 'SHARE', text: '보고 싶어' } }),
      expectsNotFound: false,
    },
    {
      route: 'POST /quotes/bulk',
      request: () => ({ path: '/quotes/bulk', body: { items: [{ text: '보고 싶어' }] } }),
      expectsNotFound: false,
    },
    {
      route: 'POST /quotes/screenshots/uploads',
      request: () => ({ path: '/quotes/screenshots/uploads', body: { mime: 'image/jpeg', bytes: 1000 } }),
      expectsNotFound: false,
    },
    { route: 'GET /quotes/:id', request: ({ b }) => ({ path: `/quotes/${b.seeded.quoteId}` }), expectsNotFound: true },
    {
      route: 'PATCH /quotes/:id',
      request: ({ b }) => ({ path: `/quotes/${b.seeded.quoteId}`, body: { memo: '탈취' } }),
      expectsNotFound: true,
    },
    {
      route: 'DELETE /quotes/:id',
      request: ({ b }) => ({ path: `/quotes/${b.seeded.quoteId}` }),
      expectsNotFound: true,
    },
    {
      route: 'POST /quotes/:id/screenshot/complete',
      request: ({ b }) => ({ path: `/quotes/${b.seeded.quoteId}/screenshot/complete` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
