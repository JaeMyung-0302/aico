import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { MemoryObjectStorage } from '../storage/memory-object-storage'
import { OBJECT_STORAGE } from '../storage/object-storage'
import { quoteScreenshotIncomingKey, quoteScreenshotKey, quoteScreenshotThumbKey } from '../storage/storage-keys'
import { QuoteCleanupCron } from './quote-cleanup.cron'

const COUPLE_ID = '0199e3a0-0000-7000-8000-0000000000c1'
const HOUR_MS = 3_600_000
const NOW = new Date('2026-10-27T19:00:00Z')

type FakeQuote = {
  id: string
  coupleId: string
  source: 'SCREENSHOT' | 'SHARE'
  screenshotThumbKey: string | null
  createdAt: Date
}

const quote = (suffix: string, ageHours: number, overrides: Partial<FakeQuote> = {}): FakeQuote => ({
  id: `0199e3a0-0000-7000-8000-0000000000${suffix}`,
  coupleId: COUPLE_ID,
  source: 'SCREENSHOT',
  screenshotThumbKey: null,
  createdAt: new Date(NOW.getTime() - ageHours * HOUR_MS),
  ...overrides,
})

type Where = { id?: string; source: string; screenshotThumbKey: null; createdAt?: { lt: Date } }
const matches = (row: FakeQuote, where: Where): boolean =>
  (where.id === undefined || row.id === where.id) &&
  row.source === where.source &&
  row.screenshotThumbKey === where.screenshotThumbKey &&
  (where.createdAt === undefined || row.createdAt < where.createdAt.lt)

// quote.findMany(source·썸네일 키·createdAt 필터) + quote.deleteMany(id·source·썸네일 키 조건부)만 흉내 낸다
const createFakePrisma = (initial: readonly FakeQuote[]) => {
  let rows = [...initial]
  return {
    quote: {
      findMany: jest.fn(async ({ where, take }: { where: Where; take: number }) =>
        rows.filter((row) => matches(row, where)).slice(0, take),
      ),
      deleteMany: jest.fn(async ({ where }: { where: Where }) => {
        const before = rows.length
        rows = rows.filter((row) => !matches(row, where))
        return { count: before - rows.length }
      }),
    },
    // 조회와 삭제 사이에 complete가 썸네일 키를 채운 경우를 흉내 낸다
    markComplete: (id: string) => {
      rows = rows.map((row) => (row.id === id ? { ...row, screenshotThumbKey: 'st.jpg' } : row))
    },
    ids: () => rows.map((row) => row.id),
  }
}

const allKeys = (id: string) => [
  quoteScreenshotKey(COUPLE_ID, id),
  quoteScreenshotThumbKey(COUPLE_ID, id),
  quoteScreenshotIncomingKey(COUPLE_ID, id),
]

const setup = async (quotes: readonly FakeQuote[]) => {
  const prisma = createFakePrisma(quotes)
  const storage = new MemoryObjectStorage()
  await Promise.all(
    quotes.flatMap(({ id }) =>
      allKeys(id).map((key) => storage.putObject({ key, body: Buffer.from('x'), contentType: 'image/jpeg' })),
    ),
  )
  const moduleRef = await Test.createTestingModule({
    providers: [
      QuoteCleanupCron,
      { provide: PrismaService, useValue: prisma },
      { provide: OBJECT_STORAGE, useValue: storage },
    ],
  }).compile()
  return { cron: moduleRef.get(QuoteCleanupCron), prisma, storage }
}

describe('QuoteCleanupCron', () => {
  afterEach(() => jest.restoreAllMocks())

  it('24시간 지난 미완료 스크린샷 문구(썸네일 키 없음)의 행과 incoming·s.jpg 객체를 지운다. 완료·최근·텍스트 문구는 그대로', async () => {
    const stale = quote('01', 25)
    const done = quote('02', 48, { screenshotThumbKey: 'st.jpg' })
    const fresh = quote('03', 23)
    const text = quote('04', 48, { source: 'SHARE' })
    const { cron, prisma, storage } = await setup([stale, done, fresh, text])

    await expect(cron.run(NOW)).resolves.toEqual({ deleted: 1 })
    expect(prisma.ids()).toEqual([done.id, fresh.id, text.id])
    const remaining = await storage.listKeys('')
    expect(allKeys(stale.id).filter((key) => remaining.includes(key))).toEqual([])
    expect([done, fresh, text].flatMap(({ id }) => allKeys(id)).every((key) => remaining.includes(key))).toBe(true)
  })

  it('조회와 삭제 사이에 complete된 문구는 행도 객체도 지우지 않는다', async () => {
    const racing = quote('05', 30)
    const { cron, prisma, storage } = await setup([racing])
    prisma.quote.findMany.mockImplementationOnce(async () => {
      const found = [racing]
      prisma.markComplete(racing.id)
      return found
    })
    await expect(cron.run(NOW)).resolves.toEqual({ deleted: 0 })
    expect(prisma.ids()).toEqual([racing.id])
    expect(await storage.listKeys('')).toHaveLength(3)
  })

  it('실행 실패는 로그만 남기고 크론을 죽이지 않는다', async () => {
    const { cron, prisma } = await setup([])
    prisma.quote.findMany.mockRejectedValueOnce(new Error('db down'))
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    await expect(cron.handle()).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
  })
})
