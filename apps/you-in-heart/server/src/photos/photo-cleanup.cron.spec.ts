import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { MemoryObjectStorage } from '../storage/memory-object-storage'
import { OBJECT_STORAGE } from '../storage/object-storage'
import { photoDisplayKey, photoIncomingKey, photoOriginalKey, photoThumbKey } from '../storage/storage-keys'
import { PhotoCleanupCron } from './photo-cleanup.cron'

const COUPLE_ID = '0199e3a0-0000-7000-8000-0000000000c1'
const HOUR_MS = 3_600_000
const NOW = new Date('2026-10-27T19:00:00Z')

type FakePhoto = { id: string; coupleId: string; status: 'PENDING' | 'READY'; createdAt: Date; originalKey: string }

const photo = (suffix: string, status: FakePhoto['status'], ageHours: number): FakePhoto => {
  const id = `0199e3a0-0000-7000-8000-0000000000${suffix}`
  return {
    id,
    coupleId: COUPLE_ID,
    status,
    createdAt: new Date(NOW.getTime() - ageHours * HOUR_MS),
    originalKey: photoOriginalKey(COUPLE_ID, id),
  }
}

type FindArgs = { where: { status: string; createdAt: { lt: Date } }; take: number }
type DeleteArgs = { where: { id: string; status: string } }

// photo.findMany(status·createdAt 필터) + photo.deleteMany(id·status 조건부)만 흉내 낸다
const createFakePrisma = (initial: readonly FakePhoto[]) => {
  let rows = [...initial]
  return {
    photo: {
      findMany: jest.fn(async ({ where, take }: FindArgs) =>
        rows.filter((row) => row.status === where.status && row.createdAt < where.createdAt.lt).slice(0, take),
      ),
      deleteMany: jest.fn(async ({ where }: DeleteArgs) => {
        const before = rows.length
        rows = rows.filter((row) => !(row.id === where.id && row.status === where.status))
        return { count: before - rows.length }
      }),
    },
    // 행 조회와 삭제 사이에 complete가 READY로 바꾼 경우를 흉내 낸다
    markReady: (id: string) => {
      rows = rows.map((row) => (row.id === id ? { ...row, status: 'READY' as const } : row))
    },
    ids: () => rows.map((row) => row.id),
  }
}

const allKeys = (id: string) => [
  photoOriginalKey(COUPLE_ID, id),
  photoIncomingKey(COUPLE_ID, id),
  photoDisplayKey(COUPLE_ID, id),
  photoThumbKey(COUPLE_ID, id),
]

const setup = async (photos: readonly FakePhoto[]) => {
  const prisma = createFakePrisma(photos)
  const storage = new MemoryObjectStorage()
  await Promise.all(
    photos.flatMap(({ id }) =>
      allKeys(id).map((key) => storage.putObject({ key, body: Buffer.from('x'), contentType: 'image/jpeg' })),
    ),
  )
  const moduleRef = await Test.createTestingModule({
    providers: [
      PhotoCleanupCron,
      { provide: PrismaService, useValue: prisma },
      { provide: OBJECT_STORAGE, useValue: storage },
    ],
  }).compile()
  return { cron: moduleRef.get(PhotoCleanupCron), prisma, storage }
}

describe('PhotoCleanupCron', () => {
  afterEach(() => jest.restoreAllMocks())

  it('24시간 지난 PENDING 행과 그 원본·incoming(+중간 실패로 남은 d·t) 객체를 지운다. READY·최근 PENDING은 그대로', async () => {
    const stale = photo('01', 'PENDING', 25)
    const ready = photo('02', 'READY', 48)
    const fresh = photo('03', 'PENDING', 23)
    const { cron, prisma, storage } = await setup([stale, ready, fresh])

    await expect(cron.run(NOW)).resolves.toEqual({ deleted: 1 })
    expect(prisma.ids()).toEqual([ready.id, fresh.id])
    const remaining = await storage.listKeys('')
    expect(allKeys(stale.id).filter((key) => remaining.includes(key))).toEqual([])
    expect([...allKeys(ready.id), ...allKeys(fresh.id)].every((key) => remaining.includes(key))).toBe(true)
  })

  it('조회와 삭제 사이에 READY가 된 사진은 행도 객체도 지우지 않는다', async () => {
    const racing = photo('04', 'PENDING', 30)
    const { cron, prisma, storage } = await setup([racing])
    prisma.photo.findMany.mockImplementationOnce(async () => {
      const found = [racing]
      prisma.markReady(racing.id)
      return found
    })
    await expect(cron.run(NOW)).resolves.toEqual({ deleted: 0 })
    expect(prisma.ids()).toEqual([racing.id])
    expect(await storage.listKeys('')).toHaveLength(4)
  })

  it('실행 실패는 로그만 남기고 크론을 죽이지 않는다', async () => {
    const { cron, prisma } = await setup([])
    prisma.photo.findMany.mockRejectedValueOnce(new Error('db down'))
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    await expect(cron.handle()).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
  })
})
