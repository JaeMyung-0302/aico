import { randomUUID } from 'node:crypto'
import type { Couple, DiaryEntry, Photo, PrismaClient, User } from '../../src/generated/prisma'

const shortId = () => randomUUID().replace(/-/g, '').slice(0, 10)

export type PairedCouple = { couple: Couple; members: [User, User] }

export const createUser = (
  prisma: PrismaClient,
  overrides: Partial<Pick<User, 'displayName' | 'status'>> = {},
): Promise<User> =>
  prisma.user.create({
    data: { displayName: `user_${shortId()}`, ...overrides },
  })

// 커플 라우트에 필요한 필수 동의(TERMS·PRIVACY)를 넣는다(CoupleGuard 동의 게이트)
export const grantRequiredConsents = async (prisma: PrismaClient, userIds: readonly string[]): Promise<void> => {
  await prisma.consent.createMany({
    data: userIds.flatMap((userId) => [
      { userId, kind: 'TERMS' as const, version: 'test' },
      { userId, kind: 'PRIVACY' as const, version: 'test' },
    ]),
  })
}

// 두 사용자를 만들고 slot 1·2로 연결한 ACTIVE 커플
export const createPairedCouple = async (
  prisma: PrismaClient,
  overrides: Partial<Pick<Couple, 'status' | 'startedOn' | 'purgeAfter'>> = {},
): Promise<PairedCouple> => {
  const [first, second] = await Promise.all([createUser(prisma), createUser(prisma)])
  const couple = await prisma.couple.create({
    data: {
      startedOn: new Date('2025-03-01'),
      ...overrides,
      members: {
        create: [
          { userId: first.id, slot: 1 },
          { userId: second.id, slot: 2 },
        ],
      },
    },
  })
  return { couple, members: [first, second] }
}

export const createEntry = (
  prisma: PrismaClient,
  coupleId: string,
  authorId: string,
  overrides: Partial<Pick<DiaryEntry, 'kind' | 'happenedOn' | 'title' | 'body' | 'placeId'>> = {},
): Promise<DiaryEntry> =>
  prisma.diaryEntry.create({
    data: { coupleId, authorId, happenedOn: new Date('2026-10-01'), body: '성수동 산책', ...overrides },
  })

export const createPhoto = (
  prisma: PrismaClient,
  coupleId: string,
  entryId: string,
  uploaderId: string,
): Promise<Photo> => {
  const id = randomUUID()
  return prisma.photo.create({
    data: {
      id,
      coupleId,
      entryId,
      uploaderId,
      originalKey: `c/${coupleId}/p/${id}/o`,
      originalBytes: 3_000_000,
      originalMime: 'image/jpeg',
    },
  })
}

export type SeededCouple = {
  anniversaryId: string
  placeId: string
  entryId: string
  photoId: string
  bucketItemId: string
  quoteId: string
  notificationLogId: string
  exportJobId: string
  eventLogId: string
}

// 커플 소유 테이블마다 행을 1개 이상 만든다. 새 커플 모델이 생기면 여기에 추가해야 purge 테스트가 통과한다
export const seedCoupleData = async (
  prisma: PrismaClient,
  { couple, members }: PairedCouple,
): Promise<SeededCouple> => {
  const coupleId = couple.id
  const authorId = members[0].id
  const anniversary = await prisma.anniversary.create({
    data: { coupleId, createdById: authorId, title: '첫 여행', date: new Date('2025-05-05') },
  })
  const place = await prisma.place.create({
    data: { coupleId, createdById: authorId, name: '한강공원', lat: 37.52, lng: 126.93 },
  })
  const entry = await createEntry(prisma, coupleId, authorId, { placeId: place.id })
  const photo = await createPhoto(prisma, coupleId, entry.id, members[1].id)
  const bucketItem = await prisma.bucketItem.create({
    data: { coupleId, createdById: authorId, title: '제주 가기', entryId: entry.id },
  })
  const quote = await prisma.quote.create({
    data: { coupleId, createdById: authorId, source: 'SHARE', text: '보고 싶어' },
  })
  const notificationLog = await prisma.notificationLog.create({
    data: { coupleId, kind: 'PARTNER_ENTRY', refKey: authorId, dueOn: new Date('2026-10-01') },
  })
  const exportJob = await prisma.exportJob.create({ data: { coupleId, requestedById: authorId } })
  const eventLog = await prisma.eventLog.create({ data: { coupleId, userId: authorId, name: 'app_open' } })
  return {
    anniversaryId: anniversary.id,
    placeId: place.id,
    entryId: entry.id,
    photoId: photo.id,
    bucketItemId: bucketItem.id,
    quoteId: quote.id,
    notificationLogId: notificationLog.id,
    exportJobId: exportJob.id,
    eventLogId: eventLog.id,
  }
}
