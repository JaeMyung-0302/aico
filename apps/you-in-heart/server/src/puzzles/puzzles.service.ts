import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  type CreatePuzzleRequest,
  type PuzzleDetail,
  type PuzzleListResponse,
  type PuzzlePiece,
  type PuzzleSummary,
  puzzleDayIndex,
  puzzleEndsOn,
  toKstDate,
} from '@you-in-heart/shared'
import { fromDbDate, toDbDate } from '../common/dates/db-date'
import type { Prisma } from '../generated/prisma'
import { VIEW_TTL_SECONDS } from '../photos/photos.service'
import { photoNotFound } from '../photos/photo-errors'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'

const PUZZLE_SELECT = {
  id: true,
  backgroundPhotoId: true,
  startsOn: true,
  endsOn: true,
  pieceCount: true,
  createdAt: true,
} satisfies Prisma.PuzzleSelect

type PuzzleRow = Prisma.PuzzleGetPayload<{ select: typeof PUZZLE_SELECT }>
type PieceRow = { happenedOn: Date; entryId: string; thumbKey: string }

const notFound = () => new NotFoundException('퍼즐을 찾을 수 없어요')
const alreadyActive = () =>
  new ConflictException({ code: 'PUZZLE_ALREADY_ACTIVE', message: '맞추는 중인 퍼즐이 이미 있어요' })

// 우리 퍼즐: 하루 = 한 조각. 조각은 그 날 일기의 READY 사진 중 가장 먼저 찍은 것(별도 테이블 없음 → 일기를 지우면 조각도 사라진다).
// 모든 함수의 첫 인자는 CoupleGuard의 coupleId
@Injectable()
export class PuzzlesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async list(coupleId: string): Promise<PuzzleListResponse> {
    const today = toKstDate(new Date())
    const rows = await this.prisma.puzzle.findMany({
      where: { coupleId },
      orderBy: [{ endsOn: 'desc' }, { id: 'desc' }],
      select: PUZZLE_SELECT,
    })
    const active = rows.find((row) => fromDbDate(row.endsOn) >= today)
    const completed = rows.filter((row) => row !== active)
    return {
      current: active ? await this.toDetail(coupleId, active, today) : null,
      completed: await Promise.all(completed.map((row) => this.toSummary(coupleId, row, today))),
    }
  }

  async get(coupleId: string, id: string): Promise<PuzzleDetail> {
    return this.toDetail(coupleId, await this.find(coupleId, id), toKstDate(new Date()))
  }

  // 시작일은 오늘(KST). 커플 행을 잠가 동시 시작 중 하나만 통과한다(진행 중 퍼즐은 한 번에 하나)
  async create(coupleId: string, actorId: string, body: CreatePuzzleRequest): Promise<PuzzleDetail> {
    const today = toKstDate(new Date())
    const background = await this.prisma.photo.findFirst({
      where: { id: body.backgroundPhotoId, coupleId, status: 'READY' },
      select: { id: true },
    })
    if (!background) throw photoNotFound()
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Couple" WHERE id = ${coupleId}::uuid FOR UPDATE`
      const active = await tx.puzzle.findFirst({
        where: { coupleId, endsOn: { gte: toDbDate(today) } },
        select: { id: true },
      })
      if (active) throw alreadyActive()
      return tx.puzzle.create({
        data: {
          coupleId,
          createdById: actorId,
          backgroundPhotoId: background.id,
          startsOn: toDbDate(today),
          endsOn: toDbDate(puzzleEndsOn(today, body.pieceCount)),
          pieceCount: body.pieceCount,
        },
        select: PUZZLE_SELECT,
      })
    })
    return this.toDetail(coupleId, row, today)
  }

  async remove(coupleId: string, id: string): Promise<void> {
    const { count } = await this.prisma.puzzle.deleteMany({ where: { id, coupleId } })
    if (count === 0) throw notFound()
  }

  private async find(coupleId: string, id: string): Promise<PuzzleRow> {
    const row = await this.prisma.puzzle.findFirst({ where: { id, coupleId }, select: PUZZLE_SELECT })
    if (!row) throw notFound()
    return row
  }

  private async toDetail(coupleId: string, row: PuzzleRow, today: string): Promise<PuzzleDetail> {
    const pieceRows = await this.pieceRows(coupleId, row)
    const startsOn = fromDbDate(row.startsOn)
    const pieces = await Promise.all(
      pieceRows.map(
        async ({ happenedOn, entryId, thumbKey }): Promise<PuzzlePiece> => ({
          dayIndex: puzzleDayIndex(startsOn, fromDbDate(happenedOn)),
          date: fromDbDate(happenedOn),
          entryId,
          thumbUrl: await this.storage.presignGet(thumbKey, VIEW_TTL_SECONDS),
        }),
      ),
    )
    return { ...(await this.summarize(coupleId, row, today, pieces.length)), pieces }
  }

  private async toSummary(coupleId: string, row: PuzzleRow, today: string): Promise<PuzzleSummary> {
    return this.summarize(coupleId, row, today, (await this.pieceRows(coupleId, row)).length)
  }

  private async summarize(
    coupleId: string,
    row: PuzzleRow,
    today: string,
    filledCount: number,
  ): Promise<PuzzleSummary> {
    return {
      id: row.id,
      startsOn: fromDbDate(row.startsOn),
      endsOn: fromDbDate(row.endsOn),
      pieceCount: row.pieceCount,
      filledCount,
      status: fromDbDate(row.endsOn) >= today ? 'ACTIVE' : 'COMPLETED',
      backgroundUrl: await this.backgroundUrl(coupleId, row.backgroundPhotoId),
      createdAt: row.createdAt.toISOString(),
    }
  }

  // 퍼즐판 사진이 지워졌거나(FK 없음) 아직 표시용이 없으면 null
  private async backgroundUrl(coupleId: string, photoId: string | null): Promise<string | null> {
    if (!photoId) return null
    const photo = await this.prisma.photo.findFirst({
      where: { id: photoId, coupleId, status: 'READY' },
      select: { displayKey: true },
    })
    return photo?.displayKey ? this.storage.presignGet(photo.displayKey, VIEW_TTL_SECONDS) : null
  }

  // 날짜마다 한 조각: 기간 안 일기의 READY 사진 중 가장 먼저 찍은 것(촬영 시각 없으면 뒤로, 같으면 id 순)
  private pieceRows(coupleId: string, row: PuzzleRow): Promise<PieceRow[]> {
    return this.prisma.$queryRaw<PieceRow[]>`
      SELECT DISTINCT ON (e."happenedOn") e."happenedOn", p."entryId", p."thumbKey"
      FROM "Photo" p
      JOIN "DiaryEntry" e ON e.id = p."entryId" AND e."coupleId" = p."coupleId"
      WHERE p."coupleId" = ${coupleId}::uuid
        AND p.status = 'READY'
        AND p."thumbKey" IS NOT NULL
        AND e."happenedOn" BETWEEN ${row.startsOn}::date AND ${row.endsOn}::date
      ORDER BY e."happenedOn", p."takenAt" ASC NULLS LAST, p.id ASC`
  }
}
