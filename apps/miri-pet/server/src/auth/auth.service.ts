import { randomBytes } from 'node:crypto'
import { ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthProvider, AuthTokens, DevLoginRequest, SocialLoginRequest } from '@miri-pet/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { PrismaService } from '../prisma/prisma.service'
import { devLoginNotFound } from './guards/dev-login.guard'
import { IdTokenVerifier } from './id-token-verifier'
import { SessionService, type UserRole } from './session.service'

type LoginUser = { id: string; role: UserRole; status: string }

// 신규 가입자 임시 닉네임(nicknameSchema 규칙 충족). 사용자가 PATCH /me로 바꾼다
const generateNickname = (): string => `미리펫${randomBytes(4).toString('hex')}`

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: IdTokenVerifier,
    private readonly sessions: SessionService,
  ) {}

  private async issueFor(user: LoginUser, isNewUser: boolean, deviceLabel?: string): Promise<AuthTokens> {
    if (user.status !== 'ACTIVE') throw new ForbiddenException('이용이 제한된 계정입니다')
    const tokens = await this.sessions.issue({ id: user.id, role: user.role }, deviceLabel)
    return { ...tokens, isNewUser }
  }

  private findLinkedUser(provider: AuthProvider, providerSub: string): Promise<{ user: LoginUser } | null> {
    return this.prisma.authAccount.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
      select: { user: { select: { id: true, role: true, status: true } } },
    })
  }

  // id_token 검증 → (provider, sub)로 기존 계정 조회, 없으면 User+AuthAccount 생성
  async socialLogin(provider: AuthProvider, body: SocialLoginRequest): Promise<AuthTokens> {
    const { sub } = await this.verifier.verify(provider, body.idToken)
    const linked = await this.findLinkedUser(provider, sub)
    if (linked) return this.issueFor(linked.user, false, body.deviceLabel)
    try {
      const user = await this.prisma.user.create({
        data: { nickname: generateNickname(), authAccounts: { create: { provider, providerSub: sub } } },
        select: { id: true, role: true, status: true },
      })
      return await this.issueFor(user, true, body.deviceLabel)
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      // 같은 계정으로 동시 가입 요청 → 먼저 만들어진 계정으로 로그인
      const winner = await this.findLinkedUser(provider, sub)
      if (!winner) throw error
      return this.issueFor(winner.user, false, body.deviceLabel)
    }
  }

  // 개발·E2E 전용: 닉네임으로 바로 로그인 (DevLoginGuard가 운영에서 차단). ADMIN 계정 탈취 경로가 되지 않도록 거부
  async devLogin(body: DevLoginRequest): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { nickname: body.nickname },
      select: { id: true, role: true, status: true },
    })
    if (existing?.role === 'ADMIN') throw devLoginNotFound()
    if (existing) return this.issueFor(existing, false, 'dev')
    const created = await this.prisma.user.create({ data: { nickname: body.nickname } })
    return this.issueFor(created, true, 'dev')
  }
}
