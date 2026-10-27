import type { DomainMatrix } from '.'

export const couplesMatrix: DomainMatrix = {
  coupleRoutes: [
    { route: 'GET /couples/me', request: () => ({ path: '/couples/me' }), expectsNotFound: false },
    {
      route: 'PATCH /couples/me',
      request: () => ({ path: '/couples/me', body: { startedOn: '2020-01-01' } }),
      expectsNotFound: false,
    },
    { route: 'POST /couples/me/unlink', request: () => ({ path: '/couples/me/unlink' }), expectsNotFound: false },
    { route: 'POST /couples/me/reconnect', request: () => ({ path: '/couples/me/reconnect' }), expectsNotFound: false },
  ],
  withoutCoupleRoutes: [
    { route: 'POST /couples/invites', reason: '미연결 사용자만 쓴다' },
    { route: 'POST /couples/join', reason: '미연결 사용자만 쓴다' },
  ],
}
