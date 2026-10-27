import { PassThrough } from 'node:stream'
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common'
import type { ExportJob, LatestExportResponse } from '@you-in-heart/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { CoupleNotifier } from '../notifications/couple-notifier'
import { createConcurrencyLimiter } from '../photos/image-sanitizer'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { exportZipKey } from '../storage/storage-keys'
import { ExportManifestBuilder } from './export-manifest'
import { writeExportZip } from './export-zip'

// 완료 후 24시간 동안 내려받을 수 있다(zip 자체는 R2 수명 주기 7일)
const DOWNLOAD_TTL_SECONDS = 86_400
// purge 직전에는 받지 않는다: 처리 중 purge가 접두사를 지우면 zip이 고아로 남거나 중간에 사라진다
const PURGE_MARGIN_MS = 60 * 60_000

const JOB_SELECT = {
  id: true,
  status: true,
  objectKey: true,
  expiresAt: true,
  createdAt: true,
  requestedById: true,
} as const
type JobRow = {
  id: string
  status: ExportJob['status']
  objectKey: string | null
  expiresAt: Date | null
  createdAt: Date
}

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')
const purgeImminent = () =>
  new ConflictException({ code: 'PURGE_IMMINENT', message: '곧 기록이 삭제돼 내보내기를 시작할 수 없어요' })
const jobNotFound = () => new NotFoundException('내보내기 작업을 찾을 수 없어요')

// architecture §5.3: ExportJob(PENDING) → 백그라운드에서 archiver 스트리밍 zip → lib-storage 멀티파트 업로드 → READY + 요청자 푸시.
// 단일 인스턴스라 처리는 프로세스 안에서 한 번에 1건(메모리 상한). 모든 함수의 첫 인자는 CoupleGuard의 coupleId
@Injectable()
export class ExportService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExportService.name)
  private readonly limit = createConcurrencyLimiter(1)
  private running: ReadonlySet<Promise<void>> = new Set()

  constructor(
    private readonly prisma: PrismaService,
    private readonly manifests: ExportManifestBuilder,
    private readonly notifier: CoupleNotifier,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  // 재시작으로 끊긴 작업은 다시 돌지 않는다 → FAILED로 바꿔 "커플당 진행 중 1건" 유니크가 새 요청을 막지 않게 한다
  async onApplicationBootstrap(): Promise<void> {
    await this.prisma.exportJob.updateMany({
      where: { status: { in: ['PENDING', 'RUNNING'] } },
      data: { status: 'FAILED', failureReason: 'interrupted' },
    })
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([...this.running])
  }

  // 진행 중인 작업이 있으면 그 작업을 돌려준다(커플당 1건, 부분 유니크 ExportJob_active_key)
  async request(coupleId: string, actorId: string): Promise<ExportJob> {
    const couple = await this.prisma.couple.findFirst({ where: { id: coupleId }, select: { purgeAfter: true } })
    if (!couple) throw jobNotFound()
    if (couple.purgeAfter && couple.purgeAfter.getTime() <= Date.now() + PURGE_MARGIN_MS) throw purgeImminent()
    const active = await this.findActive(coupleId)
    if (active) return this.toResponse(active)
    const job = await this.prisma.exportJob
      .create({ data: { coupleId, requestedById: actorId }, select: JOB_SELECT })
      .catch(async (error: unknown) => {
        const raced = isUniqueViolation(error) ? await this.findActive(coupleId) : null
        if (raced) return raced
        throw error
      })
    if (job.status === 'PENDING' && job.requestedById === actorId) this.track(coupleId, job.id, actorId)
    return this.toResponse(job)
  }

  async get(coupleId: string, jobId: string): Promise<ExportJob> {
    const job = await this.prisma.exportJob.findFirst({ where: { id: jobId, coupleId }, select: JOB_SELECT })
    if (!job) throw jobNotFound()
    return this.toResponse(job)
  }

  async latest(coupleId: string): Promise<LatestExportResponse> {
    const job = await this.prisma.exportJob.findFirst({
      where: { coupleId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: JOB_SELECT,
    })
    return { job: job ? await this.toResponse(job) : null }
  }

  private findActive(coupleId: string) {
    return this.prisma.exportJob.findFirst({
      where: { coupleId, status: { in: ['PENDING', 'RUNNING'] } },
      select: JOB_SELECT,
    })
  }

  private track(coupleId: string, jobId: string, actorId: string): void {
    const run = this.limit(() => this.process(coupleId, jobId, actorId)).finally(() => {
      this.running = new Set([...this.running].filter((item) => item !== run))
    })
    this.running = new Set([...this.running, run])
  }

  private async process(coupleId: string, jobId: string, actorId: string): Promise<void> {
    const started = await this.prisma.exportJob.updateMany({
      where: { id: jobId, coupleId, status: 'PENDING' },
      data: { status: 'RUNNING' },
    })
    if (started.count === 0) return
    const key = exportZipKey(coupleId, jobId)
    try {
      await this.writeZip(coupleId, key)
    } catch (error) {
      this.logger.error(`[export] job ${jobId} failed (${errorName(error)})`)
      await this.prisma.exportJob
        .updateMany({ where: { id: jobId, coupleId }, data: { status: 'FAILED', failureReason: errorName(error) } })
        .catch(() => undefined)
      return
    }
    await this.finish(coupleId, jobId, actorId, key)
  }

  private async writeZip(coupleId: string, key: string): Promise<void> {
    const { manifest, files } = await this.manifests.build(coupleId, new Date())
    const body = new PassThrough()
    const uploading = this.storage.uploadStream({ key, body, contentType: 'application/zip' })
    // 업로드가 먼저 실패하면 zip 쪽 배압이 풀리지 않는다 → body를 끊어 zip 작성도 실패시킨다
    const uploaded = uploading.catch((error: unknown) => {
      body.destroy(error instanceof Error ? error : new Error('업로드 실패'))
      throw error
    })
    const sources = files.map(({ path, key: objectKey }) => ({
      name: path,
      open: () => this.storage.getObjectStream(objectKey),
    }))
    const [zipped] = await Promise.allSettled([writeExportZip({ manifest, sources, sink: body }), uploaded])
    if (zipped.status === 'rejected') throw zipped.reason
    await uploaded
  }

  // 그 사이 커플이 purge되면(행 없음) 방금 올린 zip을 지운다. 푸시 실패는 작업 결과를 바꾸지 않는다
  private async finish(coupleId: string, jobId: string, actorId: string, key: string): Promise<void> {
    const now = new Date()
    const { count } = await this.prisma.exportJob.updateMany({
      where: { id: jobId, coupleId, status: 'RUNNING' },
      data: {
        status: 'READY',
        objectKey: key,
        completedAt: now,
        expiresAt: new Date(now.getTime() + DOWNLOAD_TTL_SECONDS * 1000),
      },
    })
    if (count === 0) {
      await this.storage.deleteObjects([key]).catch(() => undefined)
      return
    }
    const notice = {
      userId: actorId,
      title: '내보내기가 준비됐어요',
      body: '24시간 안에 내려받아 주세요',
      data: { type: 'EXPORT_READY', jobId },
    }
    await this.notifier.notify(coupleId, 'EXPORT_READY', [notice]).catch((error: unknown) => {
      this.logger.warn(`[export] job ${jobId} notify failed (${errorName(error)})`)
    })
  }

  private async toResponse(job: JobRow): Promise<ExportJob> {
    const secondsLeft = job.expiresAt ? Math.floor((job.expiresAt.getTime() - Date.now()) / 1000) : 0
    const isDownloadable = job.status === 'READY' && job.objectKey !== null && secondsLeft > 0
    const downloadUrl =
      isDownloadable && job.objectKey
        ? await this.storage.presignGet(job.objectKey, Math.min(DOWNLOAD_TTL_SECONDS, secondsLeft))
        : null
    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      downloadUrl,
      expiresAt: job.expiresAt?.toISOString() ?? null,
    }
  }
}
