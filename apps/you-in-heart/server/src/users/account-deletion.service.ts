import { Injectable, Logger } from '@nestjs/common'
import { DEV_SUB_PREFIX } from '../auth/auth.service'
import { UnlinkService } from '../couples/unlink.service'
import type { AuthProvider } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { KakaoUnlinkClient } from './kakao-unlink.client'

type LinkedAccount = { provider: AuthProvider; providerSub: string }

// 회원 탈퇴(DELETE /me). 0C 리뷰의 "hard delete"와 계획 0E.10의 "User DELETED"를 다음처럼 맞춘다:
// - 커플이 없으면 User 행을 바로 지운다(Cascade: 계정·세션·푸시 토큰·동의·초대)
// - 커플이 있으면 커플을 UNLINKING으로 바꾸고 User는 DELETED + 이름 null로 남긴 채 계정·세션·푸시 토큰·초대를 지운다.
//   상대가 30일간 두 사람 기록을 보고 내보낼 수 있게 CoupleMember·작성 기록을 유지하고, purge가 커플과 함께 User 행을 지운다
// TODO(ADR-003): 커플 없는 hard delete는 purge 원장에 없어 백업 복원 시 되살아난다 → 운영 런북에서 사용자 원장 여부 결정
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly unlinks: UnlinkService,
    private readonly kakao: KakaoUnlinkClient,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    const accounts = await this.prisma.authAccount.findMany({
      where: { userId },
      select: { provider: true, providerSub: true },
    })
    const coupleId = await this.unlinks.unlinkForAccountDeletion(userId)
    if (coupleId) await this.markDeleted(userId)
    else await this.prisma.user.delete({ where: { id: userId } })
    await Promise.all(accounts.map((account) => this.unlinkProvider(userId, account)))
  }

  private async markDeleted(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authAccount.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
      this.prisma.coupleInvite.deleteMany({ where: { creatorId: userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'DELETED', deletedAt: new Date(), displayName: null },
      }),
    ])
  }

  // 제공자 연결 끊기는 DB 정리 뒤에 한다. 실패해도 탈퇴는 끝난 것으로 본다(로그에는 userId만)
  private async unlinkProvider(userId: string, { provider, providerSub }: LinkedAccount): Promise<void> {
    try {
      switch (provider) {
        case 'KAKAO':
          if (providerSub.startsWith(DEV_SUB_PREFIX)) return
          await this.kakao.unlink(providerSub)
          return
        // Apple 추가 시 여기에 revoke 분기
      }
    } catch (error) {
      this.logger.warn(`[account-deletion] ${provider} unlink failed for user ${userId} (${errorName(error)})`)
    }
  }
}

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')
