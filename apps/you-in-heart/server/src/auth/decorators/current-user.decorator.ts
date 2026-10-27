import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { AuthenticatedRequest, AuthUser } from '../guards/jwt-auth.guard'

export const resolveCurrentUser = (_data: unknown, context: ExecutionContext): AuthUser => {
  const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
  if (!req.authUser) throw new UnauthorizedException('로그인이 필요합니다')
  return req.authUser
}

// JwtAuthGuard가 채운 로그인 사용자 { id }
export const CurrentUser = createParamDecorator(resolveCurrentUser)
