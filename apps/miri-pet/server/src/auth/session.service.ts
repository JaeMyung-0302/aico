import { createHash, randomBytes } from 'node:crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { DmRealtime } from '../realtime/dm-realtime'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const REFRESH_TOKEN_BYTES = 32
// 동시 refresh(앱 재개·여러 요청)로 방금 회전된 토큰이 다시 오는 경우는 탈취로 보지 않는다
export const REFRESH_REUSE_GRACE_MS = 10_000
const JWT_ALGORITHM = 'HS256'

export type UserRole = 'USER' | 'ADMIN'
export type AccessTokenPayload = { sub: string; role: UserRole }
// 소켓 handshake용: 만료 시각(초)에 연결을 끊는다
export type VerifiedAccessToken = AccessTokenPayload & { exp: number }
export type IssuedTokens = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
}

export const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex')

const isAccessTokenPayload = (value: unknown): value is AccessTokenPayload => {
  if (typeof value !== 'object' || value === null) return false
  const sub: unknown = Reflect.get(value, 'sub')
  const role: unknown = Reflect.get(value, 'role')
  return typeof sub === 'string' && (role === 'USER' || role === 'ADMIN')
}

const invalidRefresh = () => new UnauthorizedException('세션이 만료되었습니다. 다시 로그인해 주세요')

const isWithinReuseGrace = (revokedAt: Date): boolean => Date.now() - revokedAt.getTime() < REFRESH_REUSE_GRACE_MS

// Access JWT 15분 + Refresh 30일 불투명 토큰(DB에는 SHA-256 해시만). 사용 시 회전, 재사용 감지 시 전 세션 폐기
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly realtime: DmRealtime,
  ) {}

  async issue(user: { id: string; role: UserRole }, deviceLabel?: string | null): Promise<IssuedTokens> {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        deviceLabel: deviceLabel ?? null,
      },
    })
    const payload: AccessTokenPayload = { sub: user.id, role: user.role }
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      algorithm: JWT_ALGORITHM,
    })
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { sub, role } = await this.verifyAccessTokenWithExpiry(token)
    return { sub, role }
  }

  async verifyAccessTokenWithExpiry(token: string): Promise<VerifiedAccessToken> {
    try {
      const decoded: unknown = await this.jwt.verifyAsync(token, {
        algorithms: [JWT_ALGORITHM],
      })
      if (!isAccessTokenPayload(decoded)) throw new Error('payload 형식 불일치')
      const exp: unknown = Reflect.get(decoded, 'exp')
      if (typeof exp !== 'number') throw new Error('exp 없음')
      return { sub: decoded.sub, role: decoded.role, exp }
    } catch {
      throw new UnauthorizedException('유효하지 않은 access token입니다')
    }
  }

  async rotate(refreshToken: string): Promise<IssuedTokens> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashRefreshToken(refreshToken) },
      include: { user: { select: { id: true, role: true, status: true } } },
    })
    if (!session) throw invalidRefresh()
    if (session.revokedAt) {
      // 유예 시간 안의 재사용은 동시 refresh로 보고 401만. 그 이후 재사용 = 탈취 의심 → 그 사용자의 모든 세션 폐기
      if (!isWithinReuseGrace(session.revokedAt)) await this.revokeAll(session.userId)
      throw invalidRefresh()
    }
    if (session.expiresAt.getTime() <= Date.now() || session.user.status !== 'ACTIVE') throw invalidRefresh()

    // 조건부 갱신으로 동시 회전 경쟁을 막는다: 진 쪽은 방금(유예 안) 회전된 토큰이므로 401만
    const claimed = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (claimed.count === 0) throw invalidRefresh()
    return this.issue(session.user, session.deviceLabel)
  }

  // 로그아웃: 그 세션 폐기 + 열린 DM 소켓 끊기(LOW-1). 소켓은 세션과 묶여 있지 않아 사용자 소켓 전체를 끊는다 → 다른 기기는 앱이 다시 연결한다
  async revoke(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashRefreshToken(refreshToken) },
      select: { id: true, userId: true },
    })
    if (!session) return
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (count > 0) this.realtime.disconnectUser(session.userId)
  }

  // 정지·refresh 재사용(탈취 의심): 세션 전부 폐기 + 열린 DM 소켓 끊기(LOW-1)
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    this.realtime.disconnectUser(userId)
  }
}
