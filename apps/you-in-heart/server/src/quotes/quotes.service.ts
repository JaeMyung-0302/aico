import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  type BulkCreateQuotesRequest,
  type BulkCreateQuotesResponse,
  type CreateQuoteRequest,
  type CreateScreenshotUploadRequest,
  type CreateScreenshotUploadResponse,
  type CursorQuery,
  MAX_SCREENSHOT_BYTES,
  type Quote,
  type QuoteListResponse,
  type UpdateQuoteRequest,
} from '@you-in-heart/shared'
import { EventsService } from '../events/events.service'
import type { Prisma } from '../generated/prisma'
import { ImageSanitizer, InvalidImageError, SanitizerBusyError } from '../photos/image-sanitizer'
import { invalidUpload, sanitizerBusy, uploadIncomplete } from '../photos/photo-errors'
import { PUT_TTL_SECONDS, VIEW_TTL_SECONDS } from '../photos/photos.service'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { quoteScreenshotIncomingKey, quoteScreenshotKey, quoteScreenshotThumbKey } from '../storage/storage-keys'

const QUOTE_SELECT = {
  id: true,
  source: true,
  text: true,
  speakerLabel: true,
  saidAt: true,
  memo: true,
  screenshotKey: true,
  screenshotThumbKey: true,
  createdAt: true,
} satisfies Prisma.QuoteSelect

type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof QUOTE_SELECT }>

// 업로드가 끝나지 않은(complete 전 = 썸네일 키 없음) 스크린샷 문구는 목록·상세에서 숨긴다.
// DB CHECK(Quote_content_chk)가 SCREENSHOT 행에 screenshotKey NOT NULL을 요구해 업로드 요청 때 키를 먼저 넣는다
const VISIBLE: Prisma.QuoteWhereInput = { NOT: { source: 'SCREENSHOT', screenshotThumbKey: null } }

const notFound = () => new NotFoundException('문구를 찾을 수 없어요')
const invalidCursor = () => new BadRequestException('잘못된 커서예요')
const screenshotTooLarge = () =>
  new BadRequestException({ code: 'SCREENSHOT_TOO_LARGE', message: '스크린샷 파일이 너무 커요' })

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

// 문구 1개의 모든 스크린샷 객체(표시용·썸네일·업로드 후보). 삭제 때 함께 지운다
export const quoteObjectKeys = (coupleId: string, quoteId: string): string[] => [
  quoteScreenshotKey(coupleId, quoteId),
  quoteScreenshotThumbKey(coupleId, quoteId),
  quoteScreenshotIncomingKey(coupleId, quoteId),
]

// 문구 보관함(ADR-004, US-009·010). 두 멤버 모두 저장·수정·삭제한다. 모든 함수의 첫 인자는 CoupleGuard의 coupleId.
// 원문 txt는 서버에 오지 않는다(기기에서 파싱 후 고른 문구만 bulk). 스크린샷은 사진과 같은 재인코딩(EXIF 제거) 경로
@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly sanitizer: ImageSanitizer,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  // createdAt desc, id desc. cursor = 이전 페이지 마지막 id
  async list(coupleId: string, { cursor, limit }: CursorQuery): Promise<QuoteListResponse> {
    const after = cursor ? await this.findCursor(coupleId, cursor) : null
    const rows = await this.prisma.quote.findMany({
      where: {
        coupleId,
        AND: [
          VISIBLE,
          ...(after
            ? [{ OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] }]
            : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: QUOTE_SELECT,
    })
    const page = rows.slice(0, limit)
    const items = await Promise.all(page.map((row) => this.toQuote(row)))
    return { items, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null }
  }

  async get(coupleId: string, id: string): Promise<Quote> {
    return this.toQuote(await this.findVisible(coupleId, id))
  }

  async create(coupleId: string, actorId: string, body: CreateQuoteRequest): Promise<Quote> {
    const row = await this.prisma.quote.create({
      data: {
        coupleId,
        createdById: actorId,
        source: body.source,
        text: body.text,
        speakerLabel: body.speakerLabel ?? null,
        saidAt: body.saidAt ? new Date(body.saidAt) : null,
        memo: body.memo ?? null,
      },
      select: QUOTE_SELECT,
    })
    await this.events.record(coupleId, actorId, 'memory_created', { type: 'quote' })
    return this.toQuote(row)
  }

  // 카톡 txt 가져오기: 기기에서 고른 문구만, source=TXT
  async bulkCreate(coupleId: string, actorId: string, { items }: BulkCreateQuotesRequest): Promise<BulkCreateQuotesResponse> {
    const { count } = await this.prisma.quote.createMany({
      data: items.map((item) => ({
        coupleId,
        createdById: actorId,
        source: 'TXT' as const,
        text: item.text,
        speakerLabel: item.speakerLabel ?? null,
        saidAt: item.saidAt ? new Date(item.saidAt) : null,
        memo: item.memo ?? null,
      })),
    })
    await this.events.record(coupleId, actorId, 'kakao_import_completed', { count })
    await this.events.record(coupleId, actorId, 'memory_created', { type: 'quote', count })
    return { created: count }
  }

  // 빈 본문이면 바꾸지 않고 현재 값(빈 data의 updateMany는 0건으로 센다)
  async update(coupleId: string, id: string, body: UpdateQuoteRequest): Promise<Quote> {
    const current = await this.findVisible(coupleId, id)
    if (Object.keys(body).length === 0) return this.toQuote(current)
    const { count } = await this.prisma.quote.updateMany({ where: { id, coupleId }, data: body })
    if (count === 0) throw notFound()
    return this.get(coupleId, id)
  }

  // 업로드 중인 스크린샷 문구도 지울 수 있다. 객체는 커밋 뒤에 지우고, 실패해도 purge가 접두사째 지운다
  async remove(coupleId: string, id: string): Promise<void> {
    const { count } = await this.prisma.quote.deleteMany({ where: { id, coupleId } })
    if (count === 0) throw notFound()
    await this.deleteObjects(quoteObjectKeys(coupleId, id))
  }

  // SCREENSHOT 문구(썸네일 키 없음 = 업로드 중)를 먼저 만들고 incoming에 presigned PUT(5분, 형식·크기 고정)
  async createScreenshotUpload(
    coupleId: string,
    actorId: string,
    { mime, bytes, memo }: CreateScreenshotUploadRequest,
  ): Promise<CreateScreenshotUploadResponse> {
    if (bytes > MAX_SCREENSHOT_BYTES) throw screenshotTooLarge()
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.quote.create({
        data: { coupleId, createdById: actorId, source: 'SCREENSHOT', screenshotKey: '', memo: memo ?? null },
        select: { id: true },
      })
      await tx.quote.updateMany({
        where: { id: row.id, coupleId },
        data: { screenshotKey: quoteScreenshotKey(coupleId, row.id) },
      })
      return row.id
    })
    const url = await this.storage.presignPut({
      key: quoteScreenshotIncomingKey(coupleId, id),
      contentType: mime,
      contentLength: bytes,
      expiresIn: PUT_TTL_SECONDS,
    })
    return {
      quoteId: id,
      upload: { url, headers: { 'Content-Type': mime, 'Content-Length': String(bytes) } },
      expiresIn: PUT_TTL_SECONDS,
    }
  }

  // incoming → 재인코딩(EXIF 제거) → s.jpg·st.jpg → 키 저장 → incoming 삭제. 이미 끝났으면 같은 결과를 돌려준다
  async completeScreenshot(coupleId: string, actorId: string, id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findFirst({
      where: { id, coupleId, source: 'SCREENSHOT' },
      select: QUOTE_SELECT,
    })
    if (!quote) throw notFound()
    if (quote.screenshotThumbKey) return this.toQuote(quote)
    await this.writeVariants(coupleId, id)
    const { count } = await this.prisma.quote.updateMany({
      where: { id, coupleId, source: 'SCREENSHOT', screenshotThumbKey: null },
      data: { screenshotKey: quoteScreenshotKey(coupleId, id), screenshotThumbKey: quoteScreenshotThumbKey(coupleId, id) },
    })
    if (count === 0) return this.afterLostRace(coupleId, id)
    await this.deleteObjects([quoteScreenshotIncomingKey(coupleId, id)])
    await this.events.record(coupleId, actorId, 'memory_created', { type: 'quote' })
    return this.get(coupleId, id)
  }

  private async writeVariants(coupleId: string, id: string): Promise<void> {
    const incomingKey = quoteScreenshotIncomingKey(coupleId, id)
    const head = await this.storage.head(incomingKey)
    if (!head) throw uploadIncomplete()
    if (head.size > MAX_SCREENSHOT_BYTES) throw invalidUpload('스크린샷이 너무 커요')
    const input = await this.storage.getObject(incomingKey)
    if (!input) throw uploadIncomplete()
    const { display, thumb } = await this.sanitizer.sanitize(input).catch((error: unknown) => {
      if (error instanceof SanitizerBusyError) throw sanitizerBusy()
      if (error instanceof InvalidImageError) throw invalidUpload('스크린샷 이미지를 읽을 수 없어요')
      throw error
    })
    await Promise.all([
      this.storage.putObject({ key: quoteScreenshotKey(coupleId, id), body: display.buffer, contentType: 'image/jpeg' }),
      this.storage.putObject({ key: quoteScreenshotThumbKey(coupleId, id), body: thumb.buffer, contentType: 'image/jpeg' }),
    ])
  }

  // 동시 complete가 먼저 끝냈으면 그 결과를, 그 사이 문구가 지워졌으면 방금 쓴 객체를 지우고 404
  private async afterLostRace(coupleId: string, id: string): Promise<Quote> {
    const row = await this.prisma.quote.findFirst({ where: { id, coupleId }, select: QUOTE_SELECT })
    if (row?.screenshotThumbKey) return this.toQuote(row)
    await this.deleteObjects(quoteObjectKeys(coupleId, id))
    throw notFound()
  }

  private async findVisible(coupleId: string, id: string): Promise<QuoteRow> {
    const row = await this.prisma.quote.findFirst({ where: { id, coupleId, AND: [VISIBLE] }, select: QUOTE_SELECT })
    if (!row) throw notFound()
    return row
  }

  private async findCursor(coupleId: string, cursor: string): Promise<{ id: string; createdAt: Date }> {
    const row = await this.prisma.quote.findFirst({
      where: { id: cursor, coupleId },
      select: { id: true, createdAt: true },
    })
    if (!row) throw invalidCursor()
    return row
  }

  private async deleteObjects(keys: readonly string[]): Promise<void> {
    try {
      await this.storage.deleteObjects(keys)
    } catch (error) {
      this.logger.error(`[quotes] object delete failed (${keys.length}건, ${errorName(error)})`)
    }
  }

  // 스크린샷은 complete 뒤(썸네일 키 있음)에만 표시용·썸네일 1시간 서명. DB 키는 응답에 넣지 않는다
  private async toQuote({ screenshotKey, screenshotThumbKey, saidAt, createdAt, ...rest }: QuoteRow): Promise<Quote> {
    const sign = (key: string | null) =>
      key && screenshotThumbKey ? this.storage.presignGet(key, VIEW_TTL_SECONDS) : Promise.resolve(null)
    const [screenshotUrl, screenshotThumbUrl] = await Promise.all([sign(screenshotKey), sign(screenshotThumbKey)])
    return {
      ...rest,
      saidAt: saidAt?.toISOString() ?? null,
      screenshotUrl,
      screenshotThumbUrl,
      createdAt: createdAt.toISOString(),
    }
  }
}
