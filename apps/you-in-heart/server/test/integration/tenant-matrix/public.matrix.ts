import type { DomainMatrix } from '.'

// 로그인 전에 쓰는 라우트(CoupleGuard·JwtAuthGuard 모두 건너뜀)
export const publicMatrix: DomainMatrix = {
  coupleRoutes: [],
  withoutCoupleRoutes: [
    { route: 'GET /health', reason: '헬스 체크(인증 없음)' },
    { route: 'POST /auth/refresh', reason: '로그인 전' },
    { route: 'POST /auth/logout', reason: '로그인 전(refresh 토큰만)' },
    { route: 'POST /auth/dev-login', reason: '개발 전용 로그인' },
    { route: 'POST /auth/:provider', reason: '소셜 로그인' },
  ],
}
