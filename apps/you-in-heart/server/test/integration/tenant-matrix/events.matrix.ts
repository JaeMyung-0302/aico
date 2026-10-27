import type { DomainMatrix } from '.'

// app_open 등은 페어링 전에도 남긴다. coupleId는 클라이언트 값이 아니라 서버가 CoupleMember로 채운다(events.int-spec)
export const eventsMatrix: DomainMatrix = {
  coupleRoutes: [],
  withoutCoupleRoutes: [{ route: 'POST /events', reason: '페어링 전 이벤트 포함' }],
}
