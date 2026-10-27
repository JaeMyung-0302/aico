import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service'
import { SessionService } from '../session.service'

export type AuthUser = { id: string }
export type AuthenticatedRequest = Request & { authUser?: AuthUser }

const BEARER_PREFIX = 'Bearer '

const extractBearer = (header: string | undefined): string | null => {
  if (!header?.startsWith(BEARER_PREFIX)) return null
  const token = header.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

// Access JWT 검증 + 사용자 상태 확인(탈퇴 즉시 차단)
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    // 커플 라우트는 전역 CoupleGuard가 먼저 이 가드를 실행해 authUser를 채운다 → 두 번 조회하지 않는다
    if (req.authUser) return true
    const token = extractBearer(req.headers.authorization)
    if (!token) throw new UnauthorizedException('로그인이 필요합니다')
    const payload = await this.sessions.verifyAccessToken(token)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    })
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('로그인이 필요합니다')
    req.authUser = { id: user.id }
    return true
  }
}
