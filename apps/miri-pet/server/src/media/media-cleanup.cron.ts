import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import type { MediaBucket, MediaStatus } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { MediaService } from './media.service'

const STALE_AFTER_MS = 24 * 60 * 60 * 1000
const BATCH = 500

type DeletedMediaRow = { id: string; ownerId: string; bucket: MediaBucket; key: string; status: MediaStatus }

// 매일 04:00 KST
// ① 24시간이 지나도 complete되지 않은 PENDING 업로드(고아)를 DB·R2(incoming + complete 중간 실패로 남은 최종 위치)에서 지운다
// ② 24시간 넘게 어떤 접종 기록에도 붙지 않은 READY 증명서(민감 정보)를 DB·R2에서 지운다
// ③ 24시간 넘게 어떤 장소 제보에도 붙지 않은 READY 제보 사진(비공개 증빙)을 DB·R2에서 지운다
@Injectable()
export class MediaCleanupCron {
  private readonly logger = new Logger(MediaCleanupCron.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  @Cron('0 4 * * *', { name: 'media-cleanup', timeZone: 'Asia/Seoul' })
  async handle(): Promise<void> {
    try {
      await this.run()
    } catch (error) {
      this.logger.error('[media] cleanup failed', error instanceof Error ? error.stack : error)
    }
  }

  async run(
    now: Date = new Date(),
  ): Promise<{ deleted: number; orphanCertificates: number; orphanReportImages: number }> {
    const cutoff = new Date(now.getTime() - STALE_AFTER_MS)
    const deleted = await this.removeStalePending(cutoff)
    const orphanCertificates = await this.removeOrphanCertificates(cutoff)
    const orphanReportImages = await this.removeOrphanReportImages(cutoff)
    return { deleted, orphanCertificates, orphanReportImages }
  }

  private async removeStalePending(cutoff: Date): Promise<number> {
    const stale = await this.prisma.media.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true, ownerId: true, bucket: true, key: true, status: true },
      take: BATCH,
    })
    if (stale.length === 0) return 0
    const { count } = await this.prisma.media.deleteMany({
      where: { id: { in: stale.map((media) => media.id) }, status: 'PENDING' },
    })
    await this.media.purgeOwnedMedia(stale)
    return count
  }

  // 조건 확인과 삭제를 한 문장(DELETE … RETURNING)으로 해서 그 사이에 접종 기록에 붙은 증명서는 지우지 않는다
  private async removeOrphanCertificates(cutoff: Date): Promise<number> {
    const removed = await this.prisma.$queryRaw<DeletedMediaRow[]>`
      DELETE FROM "Media"
      WHERE id IN (
        SELECT m.id FROM "Media" m
        WHERE m.purpose = 'CERTIFICATE' AND m.status = 'READY' AND m."createdAt" < ${cutoff}
          AND NOT EXISTS (SELECT 1 FROM "VaccinationCertificate" vc WHERE vc."mediaId" = m.id)
        LIMIT ${BATCH}
      )
      RETURNING id, "ownerId", bucket, key, status`
    await this.media.purgeOwnedMedia(removed)
    return removed.length
  }

  private async removeOrphanReportImages(cutoff: Date): Promise<number> {
    const removed = await this.prisma.$queryRaw<DeletedMediaRow[]>`
      DELETE FROM "Media"
      WHERE id IN (
        SELECT m.id FROM "Media" m
        WHERE m.purpose = 'PLACE_REPORT' AND m.status = 'READY' AND m."createdAt" < ${cutoff}
          AND NOT EXISTS (SELECT 1 FROM "PlaceReportImage" pri WHERE pri."mediaId" = m.id)
        LIMIT ${BATCH}
      )
      RETURNING id, "ownerId", bucket, key, status`
    await this.media.purgeOwnedMedia(removed)
    return removed.length
  }
}
