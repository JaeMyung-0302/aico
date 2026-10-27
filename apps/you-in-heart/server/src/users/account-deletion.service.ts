import { Inject, Injectable, Logger } from '@nestjs/common'
import { DEV_SUB_PREFIX } from '../auth/auth.service'
import { sequentially } from '../common/async/sequentially'
import { lockUsers } from '../common/prisma/user-lock'
import { UnlinkService } from '../couples/unlink.service'
import type { AuthProvider } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { DELETED_USER_LEDGER_PREFIX, deletedUserLedgerKey, userIdFromDeletedLedgerKey } from '../storage/storage-keys'
import { KakaoUnlinkClient } from './kakao-unlink.client'

type LinkedAccount = { provider: AuthProvider; providerSub: string }

// 회원 탈퇴(DELETE /me). 0C 리뷰의 "hard delete"와 계획 0E.10의 "User DELETED"를 다음처럼 맞춘다:
// - 커플이 없으면 User 행을 바로 지운다(Cascade: 계정·세션·푸시 토큰·동의·초대)
// - 커플이 있으면 커플을 UNLINKING으로 바꾸고 User는 DELETED + 이름 null로 남긴 채 계정·세션·푸시 토큰·초대를 지운다.
//   상대가 30일간 두 사람 기록을 보고 내보낼 수 있게 CoupleMember·작성 기록을 유지하고, purge가 커플과 함께 User 행을 지운다
// DB를 바꾸기 전에 R2 원장(system/deleted-users/)을 쓴다 → 백업 복원 후 purge:replay가 탈퇴를 다시 적용한다(ADR-003)
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly unlinks: UnlinkService,
    private readonly kakao: KakaoUnlinkClient,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  // 원장 쓰기가 실패하면 DB는 그대로 두고 5xx
  async deleteAccount(userId: string): Promise<void> {
    const accounts = await this.prisma.authAccount.findMany({
      where: { userId },
      select: { provider: true, providerSub: true },
    })
    await this.storage.putObject({
      key: deletedUserLedgerKey(userId),
      body: Buffer.alloc(0),
      contentType: 'application/octet-stream',
    })
    await this.applyDeletion(userId, true)
    await Promise.all(accounts.map((account) => this.unlinkProvider(userId, account)))
  }

  // 백업 복원 직후: 원장에 있는데 DB에 남아 있는 사용자에게 탈퇴를 다시 적용한다(멱등, 알림·제공자 unlink 없음). 원장 항목 수
  async replayLedger(): Promise<number> {
    const keys = await this.storage.listKeys(DELETED_USER_LEDGER_PREFIX)
    const userIds = keys.flatMap((key) => {
      const id = userIdFromDeletedLedgerKey(key)
      return id ? [id] : []
    })
    await sequentially(userIds, async (userId) => {
      const user = await this.prisma.user.findFirst({ where: { id: userId }, select: { id: true } })
      if (!user) return
      await this.applyDeletion(userId, false)
      this.logger.log(`[purge-replay] user ${userId} deletion re-applied`)
    })
    return userIds.length
  }

  private async applyDeletion(userId: string, shouldNotify: boolean): Promise<void> {
    if (await this.deleteIfSolo(userId)) return
    const coupleId = await this.unlinks.unlinkForAccountDeletion(userId, { shouldNotify })
    if (coupleId) await this.markDeleted(userId)
    // 그 사이 커플이 purge됐으면 혼자 남은 것 → 바로 지운다
    else await this.deleteIfSolo(userId)
  }

  // 커플이 없을 때만 User를 지운다(Cascade). join과 같은 User 행 잠금을 쥔 채 확인·삭제해 그 사이 커플이 생기지 않는다
  private deleteIfSolo(userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId])
      const member = await tx.coupleMember.findUnique({ where: { userId }, select: { id: true } })
      if (member) return false
      await tx.user.deleteMany({ where: { id: userId } })
      return true
    })
  }

  // 이미 DELETED면 deletedAt을 다시 찍지 않는다(replay 멱등)
  private async markDeleted(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authAccount.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
      this.prisma.coupleInvite.deleteMany({ where: { creatorId: userId } }),
      this.prisma.user.updateMany({
        where: { id: userId, status: 'ACTIVE' },
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
