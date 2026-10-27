import { createHash, randomBytes } from 'node:crypto'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const REFRESH_TOKEN_BYTES = 32
// 동시 refresh(앱 재개·여러 요청)로 방금 회전된 토큰이 다시 오는 경우는 탈취로 보지 않는다
export const REFRESH_REUSE_GRACE_MS = 10_000
const JWT_ALGORITHM = 'HS256'

export type AccessTokenPayload = { sub: string }
export type IssuedTokens = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
}

export const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex')

const isAccessTokenPayload = (value: unknown): value is AccessTokenPayload =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'sub') === 'string'

const invalidRefresh = () => new UnauthorizedException('세션이 만료되었습니다. 다시 로그인해 주세요')

const isWithinReuseGrace = (rotatedAt: Date): boolean => Date.now() - rotatedAt.getTime() < REFRESH_REUSE_GRACE_MS

// Access JWT 15분 + Refresh 30일 불투명 토큰(DB에는 SHA-256 해시만). 사용 시 회전, 유예 후 재사용 감지 시 전 세션 폐기.
// revokedAt = 더 못 씀(회전·로그아웃·전체 폐기 공통), rotatedAt = 회전으로 폐기된 시각(재사용 판정용)
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issue(userId: string, deviceLabel?: string | null): Promise<IssuedTokens> {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        deviceLabel: deviceLabel ?? null,
      },
    })
    const payload: AccessTokenPayload = { sub: userId }
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      algorithm: JWT_ALGORITHM,
    })
    return { accessToken, refreshToken, accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const decoded: unknown = await this.jwt.verifyAsync(token, { algorithms: [JWT_ALGORITHM] })
      if (!isAccessTokenPayload(decoded)) throw new Error('payload 형식 불일치')
      return { sub: decoded.sub }
    } catch {
      throw new UnauthorizedException('유효하지 않은 access token입니다')
    }
  }

  async rotate(refreshToken: string): Promise<IssuedTokens> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashRefreshToken(refreshToken) },
      include: { user: { select: { id: true, status: true } } },
    })
    if (!session) throw invalidRefresh()
    if (session.rotatedAt) {
      // 유예 시간 안의 재사용은 동시 refresh로 보고 401만. 그 이후 재사용 = 탈취 의심 → 그 사용자의 모든 세션 폐기
      if (!isWithinReuseGrace(session.rotatedAt)) await this.revokeAll(session.userId)
      throw invalidRefresh()
    }
    if (session.revokedAt || session.expiresAt.getTime() <= Date.now() || session.user.status !== 'ACTIVE') {
      throw invalidRefresh()
    }

    // 조건부 갱신으로 동시 회전 경쟁을 막는다: 진 쪽은 방금(유예 안) 회전된 토큰이므로 401만
    const now = new Date()
    const claimed = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now, rotatedAt: now },
    })
    if (claimed.count === 0) throw invalidRefresh()
    return this.issue(session.userId, session.deviceLabel)
  }

  // 로그아웃: 그 세션만 폐기. 없는·이미 폐기된 토큰도 조용히 성공(토큰 존재 여부 비노출)
  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  // refresh 재사용(탈취 의심)·탈퇴: 세션 전부 폐기
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
