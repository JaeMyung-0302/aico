import { createParamDecorator, type ExecutionContext, ForbiddenException } from '@nestjs/common'
import type { CoupleStatus } from '../../generated/prisma'
import type { AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard'

// CoupleGuard가 CoupleMember에서 찾아 채운다. 클라이언트가 보낸 coupleId는 어디에서도 읽지 않는다
export type CoupleContext = { id: string; status: CoupleStatus }
export type CoupleRequest = AuthenticatedRequest & { couple?: CoupleContext }

export const resolveCurrentCouple = (_data: unknown, context: ExecutionContext): CoupleContext => {
  const req = context.switchToHttp().getRequest<CoupleRequest>()
  if (!req.couple) throw new ForbiddenException('커플 연결이 필요해요')
  return req.couple
}

// 서비스 함수에는 couple.id를 필수 첫 인자로 넘긴다
export const CurrentCouple = createParamDecorator(resolveCurrentCouple)
