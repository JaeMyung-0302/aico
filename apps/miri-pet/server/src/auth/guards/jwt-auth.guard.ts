import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service'
import { SessionService, type UserRole } from '../session.service'

export type AuthUser = { id: string; role: UserRole }
export type AuthenticatedRequest = Request & { authUser?: AuthUser }

const BEARER_PREFIX = 'Bearer '

const extractBearer = (header: string | undefined): string | null => {
  if (!header?.startsWith(BEARER_PREFIX)) return null
  const token = header.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

// Access JWT 검증 + 사용자 상태 확인(탈퇴·정지 즉시 차단). 이후 Phase 컨트롤러가 @UseGuards(JwtAuthGuard)로 쓴다
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = extractBearer(req.headers.authorization)
    if (!token) throw new UnauthorizedException('로그인이 필요합니다')
    const payload = await this.sessions.verifyAccessToken(token)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    })
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('로그인이 필요합니다')
    req.authUser = { id: user.id, role: user.role }
    return true
  }
}
