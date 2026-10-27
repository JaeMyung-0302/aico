import { ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthProvider, AuthTokens, DevLoginRequest, SocialLoginRequest } from '@you-in-heart/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { PrismaService } from '../prisma/prisma.service'
import { IdTokenVerifier } from './id-token-verifier'
import { SessionService } from './session.service'

type LoginUser = { id: string; status: string }

// dev 계정은 KAKAO AuthAccount에 'dev:' 접두 sub로 둔다. 실제 카카오 sub는 숫자라 겹치지 않는다
// TODO(0E): 탈퇴 시 카카오 unlink는 'dev:' sub를 건너뛸 것
export const DEV_SUB_PREFIX = 'dev:'

const USER_SELECT = { id: true, status: true } as const

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: IdTokenVerifier,
    private readonly sessions: SessionService,
  ) {}

  // id_token 검증 → (provider, sub)로 로그인. 카카오 프로필은 받지 않는다(displayName은 사용자가 입력)
  async socialLogin(provider: AuthProvider, body: SocialLoginRequest): Promise<AuthTokens> {
    const { sub } = await this.verifier.verify(provider, body.idToken)
    return this.loginWithIdentity(provider, sub, body.deviceLabel)
  }

  // 개발·E2E 전용: devKey로 바로 로그인 (DevLoginGuard가 운영에서 차단)
  devLogin(body: DevLoginRequest): Promise<AuthTokens> {
    return this.loginWithIdentity('KAKAO', `${DEV_SUB_PREFIX}${body.devKey}`, 'dev')
  }

  private async issueFor(user: LoginUser, isNewUser: boolean, deviceLabel?: string): Promise<AuthTokens> {
    if (user.status !== 'ACTIVE') throw new ForbiddenException('이용할 수 없는 계정입니다')
    const tokens = await this.sessions.issue(user.id, deviceLabel)
    return { ...tokens, isNewUser }
  }

  private findLinkedUser(provider: AuthProvider, providerSub: string): Promise<{ user: LoginUser } | null> {
    return this.prisma.authAccount.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
      select: { user: { select: USER_SELECT } },
    })
  }

  // 기존 계정 조회, 없으면 User+AuthAccount 생성
  private async loginWithIdentity(provider: AuthProvider, sub: string, deviceLabel?: string): Promise<AuthTokens> {
    const linked = await this.findLinkedUser(provider, sub)
    if (linked) return this.issueFor(linked.user, false, deviceLabel)
    try {
      const user = await this.prisma.user.create({
        data: { authAccounts: { create: { provider, providerSub: sub } } },
        select: USER_SELECT,
      })
      return await this.issueFor(user, true, deviceLabel)
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      // 같은 계정으로 동시 가입 요청 → 먼저 만들어진 계정으로 로그인
      const winner = await this.findLinkedUser(provider, sub)
      if (!winner) throw error
      return this.issueFor(winner.user, false, deviceLabel)
    }
  }
}
