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
