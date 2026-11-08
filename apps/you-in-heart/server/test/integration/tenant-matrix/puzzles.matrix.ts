import type { DomainMatrix } from '.'

// 우리 퍼즐. :id 라우트는 커플 B의 실제 puzzleId로 404. 퍼즐판 사진이 B의 사진이어도 404(puzzles.int-spec)
export const puzzlesMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /puzzles', request: () => ({ path: '/puzzles' }), expectsNotFound: false },
    {
      route: 'POST /puzzles',
      request: ({ b }) => ({ path: '/puzzles', body: { backgroundPhotoId: b.seeded.photoId, pieceCount: 100 } }),
      expectsNotFound: true,
    },
    {
      route: 'GET /puzzles/:id',
      request: ({ b }) => ({ path: `/puzzles/${b.seeded.puzzleId}` }),
      expectsNotFound: true,
    },
    {
      route: 'DELETE /puzzles/:id',
      request: ({ b }) => ({ path: `/puzzles/${b.seeded.puzzleId}` }),
      expectsNotFound: true,
    },
  ],
  withoutCoupleRoutes: [],
}
