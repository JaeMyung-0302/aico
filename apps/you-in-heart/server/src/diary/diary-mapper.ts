import type { DiaryEntry, Photo } from '@you-in-heart/shared'
import { fromDbDate } from '../common/dates/db-date'
import type { Prisma } from '../generated/prisma'

// 목록·상세에는 READY 사진만(PENDING은 아직 표시용이 없다). 원본 키·좌표는 응답에 넣지 않는다
export const ENTRY_PHOTO_SELECT = {
  id: true,
  entryId: true,
  uploaderId: true,
  status: true,
  takenAt: true,
  width: true,
  height: true,
  displayKey: true,
  thumbKey: true,
} satisfies Prisma.PhotoSelect

export type EntryPhotoRow = Prisma.PhotoGetPayload<{ select: typeof ENTRY_PHOTO_SELECT }>

export const ENTRY_SELECT = {
  id: true,
  kind: true,
  authorId: true,
  happenedOn: true,
  title: true,
  body: true,
  placeId: true,
  createdAt: true,
  updatedAt: true,
  photos: {
    where: { status: 'READY' },
    select: ENTRY_PHOTO_SELECT,
    orderBy: [{ takenAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  },
} satisfies Prisma.DiaryEntrySelect

export type EntryRow = Prisma.DiaryEntryGetPayload<{ select: typeof ENTRY_SELECT }>

export const toDiaryEntry = (row: EntryRow, photos: readonly Photo[]): DiaryEntry => ({
  id: row.id,
  kind: row.kind,
  authorId: row.authorId,
  happenedOn: fromDbDate(row.happenedOn),
  title: row.title,
  body: row.body,
  placeId: row.placeId,
  photos: [...photos],
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

export type PhotoUrls = { thumbUrl: string | null; displayUrl: string | null }

export const toPhoto = (row: EntryPhotoRow, { thumbUrl, displayUrl }: PhotoUrls): Photo => ({
  id: row.id,
  entryId: row.entryId,
  uploaderId: row.uploaderId,
  status: row.status,
  takenAt: row.takenAt?.toISOString() ?? null,
  width: row.width ?? 0,
  height: row.height ?? 0,
  thumbUrl,
  displayUrl,
})
