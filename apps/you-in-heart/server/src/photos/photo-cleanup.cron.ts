import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { sequentially } from '../common/async/sequentially'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { photoObjectKeys } from './photos.service'

const STALE_AFTER_MS = 24 * 60 * 60 * 1000
const BATCH = 500

// 매일 04:30 KST(04:00 커플 purge 다음). complete되지 않고 24시간 지난 PENDING 사진(고아)의 행과 객체를 지운다.
// 행은 status=PENDING 조건으로 1건씩 지운다 → 그 사이 complete가 READY로 바꾼 사진은 행도 객체도 건드리지 않는다
@Injectable()
export class PhotoCleanupCron {
  private readonly logger = new Logger(PhotoCleanupCron.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  @Cron('0 30 4 * * *', { name: 'photo-cleanup', timeZone: 'Asia/Seoul' })
  async handle(): Promise<void> {
    try {
      const { deleted } = await this.run()
      this.logger.log(`[photos] cleanup deleted=${deleted}`)
    } catch (error) {
      this.logger.error('[photos] cleanup failed', error instanceof Error ? error.stack : error)
    }
  }

  async run(now: Date = new Date()): Promise<{ deleted: number }> {
    const stale = await this.prisma.photo.findMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) } },
      select: { id: true, coupleId: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    })
    const removed = await sequentially(stale, async (photo) => {
      const { count } = await this.prisma.photo.deleteMany({
        where: { id: photo.id, coupleId: photo.coupleId, status: 'PENDING' },
      })
      return count === 1 ? [photo] : []
    })
    const keys = removed.flat().flatMap(({ id, coupleId }) => photoObjectKeys(coupleId, id))
    if (keys.length > 0) await this.storage.deleteObjects(keys)
    return { deleted: removed.flat().length }
  }
}
