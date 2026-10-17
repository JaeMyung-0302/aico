/**
 * 수동 발송(/api/dispatch)은 전 사용자에게 푸시를 쏘는 통로라 비밀 헤더로만 연다.
 * DISPATCH_KEY 가 없는 환경(운영 기본값)에서는 경로가 없는 것처럼 404 로 답한다.
 * 키는 .dev.vars 나 wrangler secret 으로만 넣고 코드에 두지 않는다.
 */

export const DISPATCH_HEADER = 'x-dispatch-key'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

export function isDispatchAuthorized(request: Request, dispatchKey: string | undefined): boolean {
  if (!dispatchKey) return false
  const presented = request.headers.get(DISPATCH_HEADER)
  if (!presented) return false
  return timingSafeEqual(presented, dispatchKey)
}
