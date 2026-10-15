import { Injectable, Logger } from '@nestjs/common'
import type { Media, Prisma } from '../generated/prisma'
import { MediaService, type OwnedMediaRow } from '../media/media.service'
import { collectPetMedia, deleteMediaRows } from '../pets/pet-media'
import { PrismaService } from '../prisma/prisma.service'
import { DmRealtime } from '../realtime/dm-realtime'
import { deleteSocialContent } from './delete-social-content'
import { KakaoUnlinkClient } from './kakao-unlink.client'

// DELETE /me: 한 트랜잭션으로 인증 수단·세션·관계를 지우고 식별정보를 파기한다.
// AuthAccount를 지우므로 같은 카카오/Google 계정으로 다시 가입하면 새 User가 생긴다
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly kakao: KakaoUnlinkClient,
    private readonly media: MediaService,
    private readonly realtime: DmRealtime,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    const accounts = await this.prisma.authAccount.findMany({
      where: { userId },
      select: { provider: true, providerSub: true },
    })

    const { petMedia, ownedMedia } = await this.prisma.$transaction(async (tx) => {
      const likes = await tx.like.findMany({ where: { userId }, select: { postId: true } })
      if (likes.length > 0) {
        await tx.post.updateMany({
          where: { id: { in: likes.map((like) => like.postId) } },
          data: { likeCount: { decrement: 1 } },
        })
      }
      await tx.like.deleteMany({ where: { userId } })
      await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followeeId: userId }] } })
      await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } })
      // 신고 행은 운영 근거로 남기되(User는 soft delete라 reporterId도 유지) 자유 입력 상세는 파기
      await tx.report.updateMany({ where: { reporterId: userId }, data: { detail: null } })
      await tx.pushToken.deleteMany({ where: { userId } })
      await tx.session.deleteMany({ where: { userId } })
      await tx.authAccount.deleteMany({ where: { userId } })
      // DM 상대방 화면에는 "탈퇴한 사용자"로 남고 내용은 파기
      await tx.message.updateMany({ where: { senderId: userId }, data: { body: null, mediaId: null, senderId: null } })
      // Phase 5: 내 DM 멤버 행(읽음·요청 상태) 삭제. Conversation은 상대 화면에 남는다(User는 soft delete라 FK RESTRICT와 충돌 없음)
      await tx.conversationMember.deleteMany({ where: { userId } })
      // Phase 2: 펫·접종·증명서 하드 삭제 (R2 객체는 커밋 뒤)
      const deletedPetMedia = await this.deletePets(tx, userId)
      // Phase 4: 게시물·댓글·알림 하드 삭제 + 남의 게시물 commentCount 재계산
      await deleteSocialContent(tx, userId)
      // 보안 리뷰 L5: 장소 제보는 운영 근거로 남기되 제보자 연결과 자유 입력 메모(note)는 파기 (soft delete라 FK SetNull이 안 걸림)
      await tx.$executeRaw`
        UPDATE "PlaceReport" SET "reporterId" = NULL, payload = payload - 'note'
        WHERE "reporterId" = ${userId}::uuid`
      // 보안 리뷰 H1: 위에서 지운 것 외에 남은 내 소유 Media 전체(게시물·DM·프로필 사진·미완료 업로드) 행 삭제
      const remainingMedia = await this.deleteOwnedMedia(tx, userId)
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'DELETED',
          nickname: null,
          bio: null,
          avatarMediaId: null,
          birthYearVerifiedAt: null,
          deletedAt: new Date(),
        },
      })
      return { petMedia: deletedPetMedia, ownedMedia: remainingMedia }
    })

    // 열린 DM 소켓을 끊는다(LOW-1). 외부 정리(R2 삭제·카카오 unlink)는 커밋 뒤. 실패는 로그만 남기고 탈퇴는 완료로 둔다
    this.realtime.disconnectUser(userId)
    await this.media.purgeMedia(petMedia)
    await this.media.purgeOwnedMedia(ownedMedia)
    await this.unlinkKakao(userId, accounts)
  }

  // 펫 → 접종 → 증명서 행은 FK cascade, 증명서·펫 사진 Media 행은 직접 지운다
  private async deletePets(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<Array<Pick<Media, 'id' | 'bucket' | 'key' | 'status'>>> {
    const media = await collectPetMedia(tx, { ownerId: userId })
    await tx.pet.deleteMany({ where: { ownerId: userId } })
    await deleteMediaRows(tx, media)
    return media
  }

  // PostImage·MediaAccessLog는 cascade, Message.mediaId·User/Pet avatar는 SetNull. R2 객체는 커밋 뒤(PENDING의 최종 위치 포함)
  private async deleteOwnedMedia(tx: Prisma.TransactionClient, userId: string): Promise<OwnedMediaRow[]> {
    const media = await tx.media.findMany({
      where: { ownerId: userId },
      select: { id: true, ownerId: true, bucket: true, key: true, status: true },
    })
    await deleteMediaRows(tx, media)
    return media
  }

  // 외부 실패는 로그만 남긴다(탈퇴 자체는 이미 커밋됨). 운영자가 grep으로 재시도 대상을 찾도록 고정 접두어 + userId
  // TODO: 실패가 잦아지면 PendingProviderUnlink 테이블 + admin users:retry-unlinks 로 승격
  private async unlinkKakao(
    userId: string,
    accounts: ReadonlyArray<{ provider: string; providerSub: string }>,
  ): Promise<void> {
    const kakaoSubs = accounts.filter((account) => account.provider === 'KAKAO').map((account) => account.providerSub)
    await Promise.all(
      kakaoSubs.map((sub) =>
        this.kakao.unlink(sub).catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error)
          this.logger.warn(`[account-deletion] kakao unlink failed ${userId} (탈퇴는 완료): ${reason}`)
        }),
      ),
    )
  }
}
