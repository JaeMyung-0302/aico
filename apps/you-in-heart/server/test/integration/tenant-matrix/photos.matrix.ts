import type { DomainMatrix } from '.'

// 사진. 업로드 요청의 entryId·:id 모두 커플 B의 실제 id면 404(presign 호출 없음은 photos.int-spec에서 검사)
export const photosMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /photos', request: () => ({ path: '/photos' }), expectsNotFound: false },
    {
      route: 'POST /photos/uploads',
      request: ({ b }) => ({
        path: '/photos/uploads',
        body: { entryId: b.seeded.entryId, originalMime: 'image/jpeg', originalBytes: 1000 },
      }),
      expectsNotFound: true,
    },
    { route: 'GET /photos/:id', request: ({ b }) => ({ path: `/photos/${b.seeded.photoId}` }), expectsNotFound: true },
    {
      route: 'POST /photos/:id/complete',
      request: ({ b }) => ({ path: `/photos/${b.seeded.photoId}/complete` }),
      expectsNotFound: true,
    },
    {
      route: 'POST /photos/:id/uploads/renew',
      request: ({ b }) => ({ path: `/photos/${b.seeded.photoId}/uploads/renew` }),
      expectsNotFound: true,
    },
    {
      route: 'GET /photos/:id/original',
      request: ({ b }) => ({ path: `/photos/${b.seeded.photoId}/original` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
