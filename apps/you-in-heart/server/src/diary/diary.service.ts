import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  type CreateAutoDaysRequest,
  type CreateAutoDaysResponse,
  type CreateDiaryRequest,
  type DiaryEntry,
  type DiaryListQuery,
  type DiaryListResponse,
  toKstDate,
  type UpdateDiaryRequest,
} from '@you-in-heart/shared'
import { fromDbDate, toDbDate } from '../common/dates/db-date'
import { isForeignKeyViolation, isUniqueViolation } from '../common/prisma/prisma-errors'
import { CouplesService, type PartnerNotice } from '../couples/couples.service'
import { EventsService } from '../events/events.service'
import type { Prisma } from '../generated/prisma'
import { photoObjectKeys, PhotosService } from '../photos/photos.service'
import { PrismaService } from '../prisma/prisma.service'
import { ENTRY_SELECT, type EntryRow, toDiaryEntry } from './diary-mapper'
import { lockEntry } from './entry-lock'

const KST_OFFSET_MS = 9 * 3_600_000

// 잠금 화면에 보이므로 일기 제목·본문·날짜는 넣지 않는다
const PARTNER_ENTRY: PartnerNotice = {
  title: '새 기록이 올라왔어요',
  body: '앱에서 확인해 보세요',
  type: 'PARTNER_ENTRY',
}

// KST 정시 버킷 'YYYY-MM-DDTHH'. 작성자당 버킷 하나에 푸시 1건(0C 규칙: refKey에 시간 버킷 포함)
const kstHourBucket = (now: Date): string => new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 13)

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

const notFound = () => new NotFoundException('일기를 찾을 수 없어요')
const notAuthor = () => new ForbiddenException({ code: 'NOT_AUTHOR', message: '작성자만 수정·삭제할 수 있어요' })

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
    private readonly photos: PhotosService,
    private readonly couples: CouplesService,
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
    await this.notifyPartnerOnce(coupleId, actorId, row.id, new Date())
    return this.toResponse(row)
  }

  // happenedOn desc, id desc. cursor = 이전 페이지 마지막 id, before = 그 날짜보다 이전(배타). placeId = 지도 핀의 일기만
  async list(
    coupleId: string,
    { cursor, limit, before }: DiaryListQuery,
    { placeId }: { placeId?: string } = {},
  ): Promise<DiaryListResponse> {
    const after = cursor ? await this.findCursor(coupleId, cursor) : null
    const conditions: Prisma.DiaryEntryWhereInput[] = [
      ...(before ? [{ happenedOn: { lt: toDbDate(before) } }] : []),
      ...(after
        ? [{ OR: [{ happenedOn: { lt: after.happenedOn } }, { happenedOn: after.happenedOn, id: { lt: after.id } }] }]
        : []),
    ]
    const rows = await this.prisma.diaryEntry.findMany({
      where: { coupleId, ...(placeId ? { placeId } : {}), AND: conditions },
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
    // 확인과 저장 사이에 핀이 지워지면 FK 위반 → 장소 404
    const { count } = await this.prisma.diaryEntry
      .updateMany({ where: { id, coupleId, authorId: actorId }, data: toUpdateData(body) })
      .catch((error: unknown) => {
        if (isForeignKeyViolation(error)) throw new NotFoundException('장소를 찾을 수 없어요')
        throw error
      })
    if (count === 0) throw notFound()
    return this.get(coupleId, id)
  }

  // FK NO ACTION인 BucketItem.entryId를 먼저 비우고 지운다(사진 행은 Cascade). 사진 객체(o·incoming·d·t)는 커밋 뒤에 지운다
  async remove(coupleId: string, actorId: string, id: string): Promise<void> {
    await this.assertAuthor(coupleId, actorId, id)
    const keys = await this.prisma.$transaction(async (tx) => {
      if (!(await lockEntry(tx, coupleId, id))) throw notFound()
      const photos = await tx.photo.findMany({ where: { coupleId, entryId: id }, select: { id: true } })
      await tx.bucketItem.updateMany({ where: { coupleId, entryId: id }, data: { entryId: null } })
      const { count } = await tx.diaryEntry.deleteMany({ where: { id, coupleId, authorId: actorId } })
      if (count === 0) throw notFound()
      return photos.flatMap((photo) => photoObjectKeys(coupleId, photo.id))
    })
    await this.photos.deleteObjects(keys)
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

  // NotificationLog(PARTNER_ENTRY, coupleId, '{작성자}:{KST 시간 버킷}', KST 날짜) insert 성공 = 이번 시간의 첫 기록.
  // 알림 실패로 일기 저장을 실패시키지 않는다(재시도가 중복 일기를 만든다)
  private async notifyPartnerOnce(coupleId: string, actorId: string, entryId: string, now: Date): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          coupleId,
          kind: 'PARTNER_ENTRY',
          refKey: `${actorId}:${kstHourBucket(now)}`,
          dueOn: toDbDate(toKstDate(now)),
        },
      })
      await this.couples.notifyPartner(coupleId, actorId, { ...PARTNER_ENTRY, data: { entryId } })
    } catch (error) {
      if (isUniqueViolation(error)) return
      this.logger.warn(`[diary] partner notify failed (${errorName(error)})`)
    }
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

  // 사진은 READY만, 썸네일·표시용 1시간 서명(원본 URL 없음)
  private async toResponse(row: EntryRow): Promise<DiaryEntry> {
    return toDiaryEntry(row, await this.photos.toPhotos(row.photos))
  }
}
