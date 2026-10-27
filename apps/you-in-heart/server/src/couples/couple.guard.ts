import {
  type CanActivate,
  ConflictException,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { ALLOW_DURING_UNLINKING_KEY } from './decorators/allow-during-unlinking.decorator'
import { ALLOW_WITHOUT_COUPLE_KEY } from './decorators/allow-without-couple.decorator'
import type { CoupleRequest } from './decorators/current-couple.decorator'

export type { CoupleRequest } from './decorators/current-couple.decorator'

const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD'])

// 전역 APP_GUARD(ThrottlerGuard 다음). 기본값이 "커플 필수"라 데코레이터를 빠뜨린 새 라우트도 막힌다.
// 전역 가드는 라우트의 @Authenticated()보다 먼저 돌기 때문에 여기서 JwtAuthGuard를 직접 실행한다
@Injectable()
export class CoupleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuth: JwtAuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.hasMetadata(context, ALLOW_WITHOUT_COUPLE_KEY)) return true
    const req = context.switchToHttp().getRequest<CoupleRequest>()
    if (!req.authUser) await this.jwtAuth.canActivate(context)
    const userId = req.authUser?.id
    if (!userId) throw new ForbiddenException('커플 연결이 필요해요')

    const member = await this.prisma.coupleMember.findUnique({
      where: { userId },
      select: { couple: { select: { id: true, status: true } } },
    })
    if (!member) throw new ForbiddenException('커플 연결이 필요해요')
    req.couple = { id: member.couple.id, status: member.couple.status }
    if (member.couple.status === 'UNLINKING' && !this.isAllowedDuringUnlinking(context, req.method)) throw unlinking()
    return true
  }

  private isAllowedDuringUnlinking(context: ExecutionContext, method: string): boolean {
    return READ_METHODS.has(method.toUpperCase()) || this.hasMetadata(context, ALLOW_DURING_UNLINKING_KEY)
  }

  private hasMetadata(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(key, [context.getHandler(), context.getClass()]) === true
    )
  }
}

const unlinking = () => new ConflictException('연결 해제 중에는 보기와 내보내기만 할 수 있어요')
