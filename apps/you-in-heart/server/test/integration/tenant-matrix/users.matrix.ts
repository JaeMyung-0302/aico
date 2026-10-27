import type { DomainMatrix } from '.'

// /me는 사용자 단위 데이터라 커플 연결 전에도 쓴다. 커플 요약(GET /me)은 서버가 CoupleMember로만 찾는다
export const usersMatrix: DomainMatrix = {
  coupleRoutes: [],
  withoutCoupleRoutes: [
    { route: 'GET /me', reason: '온보딩·커플 요약(서버가 userId로 조회)' },
    { route: 'PATCH /me', reason: '이름 입력은 페어링 전' },
    { route: 'PUT /me/consents', reason: '동의는 페어링 전' },
    { route: 'DELETE /me', reason: '회원 탈퇴는 미연결·유예 중에도 가능해야 한다' },
    { route: 'POST /me/push-tokens', reason: '기기 토큰은 사용자 단위' },
    { route: 'DELETE /me/push-tokens/:token', reason: '기기 토큰은 사용자 단위' },
  ],
}
