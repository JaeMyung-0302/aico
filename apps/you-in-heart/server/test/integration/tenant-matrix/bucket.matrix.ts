import type { DomainMatrix } from '.'

// 버킷리스트. :id 라우트는 커플 B의 실제 bucketItemId로 404. 완료 시 연결하는 entryId가 B의 일기여도 404(bucket.int-spec)
export const bucketMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /bucket', request: () => ({ path: '/bucket' }), expectsNotFound: false },
    {
      route: 'POST /bucket',
      request: () => ({ path: '/bucket', body: { title: '제주 가기' } }),
      expectsNotFound: false,
    },
    {
      route: 'PATCH /bucket/:id',
      request: ({ b }) => ({ path: `/bucket/${b.seeded.bucketItemId}`, body: { done: true } }),
      expectsNotFound: true,
    },
    {
      route: 'DELETE /bucket/:id',
      request: ({ b }) => ({ path: `/bucket/${b.seeded.bucketItemId}` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
