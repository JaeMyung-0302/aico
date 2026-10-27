import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { sequentially } from '../common/async/sequentially'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { quoteObjectKeys } from './quotes.service'

const STALE_AFTER_MS = 24 * 60 * 60 * 1000
const BATCH = 500
// 업로드 요청만 하고 complete되지 않은(썸네일 키 없음) 스크린샷 문구
const UNFINISHED = { source: 'SCREENSHOT', screenshotThumbKey: null } as const

// 매일 04:40 KST(04:30 사진 정리 다음). photo-cleanup과 같은 방식으로 24시간 지난 미완료 스크린샷 문구의 행과 객체를 지운다.
// 행은 미완료 조건으로 1건씩 지운다 → 그 사이 complete가 썸네일 키를 채운 문구는 행도 객체도 건드리지 않는다
@Injectable()
export class QuoteCleanupCron {
  private readonly logger = new Logger(QuoteCleanupCron.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  @Cron('0 40 4 * * *', { name: 'quote-cleanup', timeZone: 'Asia/Seoul' })
  async handle(): Promise<void> {
    try {
      const { deleted } = await this.run()
      this.logger.log(`[quotes] cleanup deleted=${deleted}`)
    } catch (error) {
      this.logger.error('[quotes] cleanup failed', error instanceof Error ? error.stack : error)
    }
  }

  async run(now: Date = new Date()): Promise<{ deleted: number }> {
    const stale = await this.prisma.quote.findMany({
      where: { ...UNFINISHED, createdAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) } },
      select: { id: true, coupleId: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    })
    const removed = await sequentially(stale, async (quote) => {
      const { count } = await this.prisma.quote.deleteMany({
        where: { id: quote.id, coupleId: quote.coupleId, ...UNFINISHED },
      })
      return count === 1 ? [quote] : []
    })
    // 커밋된 행 삭제 뒤에 객체를 지운다(incoming·중간 실패로 남은 s.jpg·st.jpg)
    const keys = removed.flat().flatMap(({ id, coupleId }) => quoteObjectKeys(coupleId, id))
    if (keys.length > 0) await this.storage.deleteObjects(keys)
    return { deleted: removed.flat().length }
  }
}
