import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { hasRequiredConsents } from '../../common/consents'
import { PrismaService } from '../../prisma/prisma.service'
import { ALLOW_WITHOUT_CONSENT_KEY } from '../decorators/allow-without-consent.decorator'
import type { AuthenticatedRequest } from './jwt-auth.guard'

export const CONSENT_REQUIRED_CODE = 'CONSENT_REQUIRED'

// 필수 동의 전에는 서버도 기능을 막는다(앱 화면 게이트만으로는 API 직접 호출을 못 막음). JwtAuthGuard 다음에 실행
@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isOpen = this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_WITHOUT_CONSENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isOpen === true) return true
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!req.authUser) throw new UnauthorizedException('로그인이 필요합니다')
    if (await hasRequiredConsents(this.prisma.consent, req.authUser.id)) return true
    throw new ForbiddenException({ code: CONSENT_REQUIRED_CODE, message: '필수 약관 동의가 필요해요' })
  }
}
