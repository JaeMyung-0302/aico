import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  BucketItem,
  BucketListResponse,
  CreateBucketItemRequest,
  UpdateBucketItemRequest,
} from '@you-in-heart/shared'
import { isForeignKeyViolation } from '../common/prisma/prisma-errors'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

const BUCKET_SELECT = {
  id: true,
  title: true,
  doneAt: true,
  entryId: true,
  createdAt: true,
} satisfies Prisma.BucketItemSelect

type BucketRow = Prisma.BucketItemGetPayload<{ select: typeof BUCKET_SELECT }>

const toBucketItem = (row: BucketRow): BucketItem => ({
  ...row,
  doneAt: row.doneAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
})

const notFound = () => new NotFoundException('버킷리스트 항목을 찾을 수 없어요')
const entryNotFound = () => new NotFoundException('일기를 찾을 수 없어요')
const notDone = () =>
  new BadRequestException({ code: 'BUCKET_NOT_DONE', message: '완료한 항목에만 일기를 연결할 수 있어요' })

// 완료(done=true)는 처음 완료 시각을 유지하고, 완료 취소(done=false)는 일기 연결도 푼다. 일기 연결은 완료 상태에서만
const toUpdateData = (
  { title, done, entryId }: UpdateBucketItemRequest,
  wasDone: boolean,
  now: Date,
): Prisma.BucketItemUncheckedUpdateManyInput => ({
  ...(title !== undefined ? { title } : {}),
  ...(done === true && !wasDone ? { doneAt: now } : {}),
  ...(done === false ? { doneAt: null, entryId: null } : {}),
  ...(done !== false && entryId !== undefined ? { entryId } : {}),
})

// 버킷리스트(US-007). 두 멤버 모두 추가·완료·삭제한다. 모든 함수의 첫 인자는 CoupleGuard의 coupleId
@Injectable()
export class BucketService {
  constructor(private readonly prisma: PrismaService) {}

  async list(coupleId: string): Promise<BucketListResponse> {
    const rows = await this.prisma.bucketItem.findMany({
      where: { coupleId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: BUCKET_SELECT,
    })
    return { items: rows.map(toBucketItem) }
  }

  async create(coupleId: string, actorId: string, { title }: CreateBucketItemRequest): Promise<BucketItem> {
    const row = await this.prisma.bucketItem.create({
      data: { coupleId, createdById: actorId, title },
      select: BUCKET_SELECT,
    })
    return toBucketItem(row)
  }

  // entryId는 같은 커플 일기만(다른 커플 = 404). 확인과 저장 사이에 일기가 지워지면 FK 위반 → 404
  async update(coupleId: string, id: string, body: UpdateBucketItemRequest): Promise<BucketItem> {
    const current = await this.find(coupleId, id)
    const wasDone = current.doneAt !== null
    const willBeDone = body.done ?? wasDone
    if (body.entryId && !willBeDone) throw notDone()
    if (body.entryId) await this.assertEntry(coupleId, body.entryId)
    const data = toUpdateData(body, wasDone, new Date())
    // 바뀔 값이 없으면(이미 완료한 항목을 다시 완료) 그대로 돌려준다. 빈 data의 updateMany는 0건으로 센다
    if (Object.keys(data).length === 0) return toBucketItem(current)
    const { count } = await this.prisma.bucketItem
      .updateMany({ where: { id, coupleId }, data })
      .catch((error: unknown) => {
        if (isForeignKeyViolation(error)) throw entryNotFound()
        throw error
      })
    if (count === 0) throw notFound()
    return toBucketItem(await this.find(coupleId, id))
  }

  async remove(coupleId: string, id: string): Promise<void> {
    const { count } = await this.prisma.bucketItem.deleteMany({ where: { id, coupleId } })
    if (count === 0) throw notFound()
  }

  private async find(coupleId: string, id: string): Promise<BucketRow> {
    const row = await this.prisma.bucketItem.findFirst({ where: { id, coupleId }, select: BUCKET_SELECT })
    if (!row) throw notFound()
    return row
  }

  private async assertEntry(coupleId: string, entryId: string): Promise<void> {
    const entry = await this.prisma.diaryEntry.findFirst({ where: { id: entryId, coupleId }, select: { id: true } })
    if (!entry) throw entryNotFound()
  }
}
