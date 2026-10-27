import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type {
  CreateAutoDaysRequest,
  CreateAutoDaysResponse,
  CreateDiaryRequest,
  DiaryEntry,
  DiaryListQuery,
  DiaryListResponse,
  Photo,
  UpdateDiaryRequest,
} from '@you-in-heart/shared'
import { fromDbDate, toDbDate } from '../common/dates/db-date'
import { EventsService } from '../events/events.service'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { ENTRY_SELECT, type EntryRow, toDiaryEntry, toPhoto } from './diary-mapper'
import { lockEntry } from './entry-lock'

const notFound = () => new NotFoundException('일기를 찾을 수 없어요')
const notAuthor = () => new ForbiddenException({ code: 'NOT_AUTHOR', message: '작성자만 수정·삭제할 수 있어요' })

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

const toUpdateData = ({
  happenedOn,
  title,
  body,
  placeId,
}: UpdateDiaryRequest): Prisma.DiaryEntryUncheckedUpdateManyInput => ({
  ...(happenedOn !== undefined ? { happenedOn: toDbDate(happenedOn) } : {}),
  ...(title !== undefined ? { title } : {}),
  ...(body !== undefined ? { body } : {}),
  ...(placeId !== undefined ? { placeId } : {}),
})

// 모든 함수의 첫 인자는 CoupleGuard의 coupleId. 조회는 findFirst({ id, coupleId })만 쓴다.
// 작성자 권한(US-003)은 테넌트 위의 2차 조건: 다른 커플 404 → 같은 커플의 상대 403
@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async create(
    coupleId: string,
    actorId: string,
    { happenedOn, title, body }: CreateDiaryRequest,
  ): Promise<DiaryEntry> {
    const row = await this.prisma.diaryEntry.create({
      data: { coupleId, authorId: actorId, happenedOn: toDbDate(happenedOn), title: title ?? null, body },
      select: ENTRY_SELECT,
    })
    await this.events.record(coupleId, actorId, 'memory_created', { type: 'diary' })
    return this.toResponse(row)
  }

  // happenedOn desc, id desc. cursor = 이전 페이지 마지막 id, before = 그 날짜보다 이전(배타)
  async list(coupleId: string, { cursor, limit, before }: DiaryListQuery): Promise<DiaryListResponse> {
    const after = cursor ? await this.findCursor(coupleId, cursor) : null
    const conditions: Prisma.DiaryEntryWhereInput[] = [
      ...(before ? [{ happenedOn: { lt: toDbDate(before) } }] : []),
      ...(after
        ? [{ OR: [{ happenedOn: { lt: after.happenedOn } }, { happenedOn: after.happenedOn, id: { lt: after.id } }] }]
        : []),
    ]
    const rows = await this.prisma.diaryEntry.findMany({
      where: { coupleId, AND: conditions },
      orderBy: [{ happenedOn: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: ENTRY_SELECT,
    })
    const page = rows.slice(0, limit)
    const items = await Promise.all(page.map((row) => this.toResponse(row)))
    return { items, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null }
  }

  async get(coupleId: string, id: string): Promise<DiaryEntry> {
    const row = await this.prisma.diaryEntry.findFirst({ where: { id, coupleId }, select: ENTRY_SELECT })
    if (!row) throw notFound()
    return this.toResponse(row)
  }

  async update(coupleId: string, actorId: string, id: string, body: UpdateDiaryRequest): Promise<DiaryEntry> {
    await this.assertAuthor(coupleId, actorId, id)
    if (body.placeId) await this.assertPlace(coupleId, body.placeId)
    const { count } = await this.prisma.diaryEntry.updateMany({
      where: { id, coupleId, authorId: actorId },
      data: toUpdateData(body),
    })
    if (count === 0) throw notFound()
    return this.get(coupleId, id)
  }

  // FK NO ACTION인 BucketItem.entryId를 먼저 비우고 지운다(사진 행은 Cascade). R2 객체는 커밋 뒤에 지운다
  async remove(coupleId: string, actorId: string, id: string): Promise<void> {
    await this.assertAuthor(coupleId, actorId, id)
    const keys = await this.prisma.$transaction(async (tx) => {
      if (!(await lockEntry(tx, coupleId, id))) throw notFound()
      const photos = await tx.photo.findMany({
        where: { coupleId, entryId: id },
        select: { originalKey: true, displayKey: true, thumbKey: true },
      })
      await tx.bucketItem.updateMany({ where: { coupleId, entryId: id }, data: { entryId: null } })
      const { count } = await tx.diaryEntry.deleteMany({ where: { id, coupleId, authorId: actorId } })
      if (count === 0) throw notFound()
      return photos.flatMap(({ originalKey, displayKey, thumbKey }) =>
        [originalKey, displayKey, thumbKey].filter((key): key is string => key !== null),
      )
    })
    await this.deleteObjects(keys)
  }

  // 날짜별 AUTO_DAY("그날의 사진") 멱등 생성: 부분 유니크(coupleId, happenedOn) WHERE kind='AUTO_DAY' + ON CONFLICT DO NOTHING
  async createAutoDays(
    coupleId: string,
    actorId: string,
    { dates }: CreateAutoDaysRequest,
  ): Promise<CreateAutoDaysResponse> {
    const days = [...new Set(dates)].sort().map(toDbDate)
    await this.prisma.diaryEntry.createMany({
      data: days.map((happenedOn) => ({ coupleId, authorId: actorId, kind: 'AUTO_DAY' as const, happenedOn })),
      skipDuplicates: true,
    })
    const rows = await this.prisma.diaryEntry.findMany({
      where: { coupleId, kind: 'AUTO_DAY', happenedOn: { in: days } },
      select: { id: true, happenedOn: true },
      orderBy: { happenedOn: 'asc' },
    })
    return { entries: rows.map(({ id, happenedOn }) => ({ id, happenedOn: fromDbDate(happenedOn) })) }
  }

  private async findCursor(coupleId: string, cursor: string): Promise<{ id: string; happenedOn: Date }> {
    const row = await this.prisma.diaryEntry.findFirst({
      where: { id: cursor, coupleId },
      select: { id: true, happenedOn: true },
    })
    if (!row) throw new BadRequestException('잘못된 커서예요')
    return row
  }

  private async assertAuthor(coupleId: string, actorId: string, id: string): Promise<void> {
    const row = await this.prisma.diaryEntry.findFirst({ where: { id, coupleId }, select: { authorId: true } })
    if (!row) throw notFound()
    if (row.authorId !== actorId) throw notAuthor()
  }

  private async assertPlace(coupleId: string, placeId: string): Promise<void> {
    const place = await this.prisma.place.findFirst({ where: { id: placeId, coupleId }, select: { id: true } })
    if (!place) throw new NotFoundException('장소를 찾을 수 없어요')
  }

  // 객체 삭제 실패는 요청을 실패시키지 않는다(행은 이미 지워짐). 남은 객체는 커플 purge가 접두사째 지운다
  private async deleteObjects(keys: readonly string[]): Promise<void> {
    try {
      await this.storage.deleteObjects(keys)
    } catch (error) {
      this.logger.error(`[diary] object delete failed (${keys.length}건, ${errorName(error)})`)
    }
  }

  private async toResponse(row: EntryRow): Promise<DiaryEntry> {
    const photos: Photo[] = row.photos.map((photo) => toPhoto(photo, { thumbUrl: null, displayUrl: null }))
    return toDiaryEntry(row, photos)
  }
}
