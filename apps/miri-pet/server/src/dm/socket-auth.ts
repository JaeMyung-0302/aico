import { Injectable, UnauthorizedException } from '@nestjs/common'
import { SessionService } from '../auth/session.service'
import { hasRequiredConsents } from '../common/consents'
import { PrismaService } from '../prisma/prisma.service'

export type HandshakeLike = {
  auth: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}

const BEARER_PREFIX = 'Bearer '

// 앱은 socket.io-client의 auth.token으로 access JWT를 보낸다. 헤더(Authorization: Bearer)도 받는다
export const extractSocketToken = ({ auth, headers }: HandshakeLike): string | null => {
  const fromAuth = auth.token
  if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth
  const header = headers.authorization
  if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) return null
  const token = header.slice(BEARER_PREFIX.length).trim()
  return token.length > 0 ? token : null
}

export type SocketIdentity = { userId: string; exp: number }

// REST의 JwtAuthGuard + ConsentGuard와 같은 판정: 유효한 access JWT + ACTIVE + 필수 동의. exp(초)는 만료 시 끊기용
@Injectable()
export class SocketAuthenticator {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(handshake: HandshakeLike): Promise<SocketIdentity> {
    const token = extractSocketToken(handshake)
    if (!token) throw new UnauthorizedException('로그인이 필요합니다')
    const payload = await this.sessions.verifyAccessTokenWithExpiry(token)
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, status: true } })
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('로그인이 필요합니다')
    if (!(await hasRequiredConsents(this.prisma.consent, user.id))) {
      throw new UnauthorizedException('필수 약관 동의가 필요해요')
    }
    return { userId: user.id, exp: payload.exp }
  }
}
