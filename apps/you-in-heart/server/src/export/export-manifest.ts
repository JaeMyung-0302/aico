import { Injectable } from '@nestjs/common'
import { type ExportManifestV1, exportManifestV1Schema } from '@you-in-heart/shared'
import { fromDbDate } from '../common/dates/db-date'
import type { BucketItem, Place, Quote } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { ConsentService } from '../users/consent.service'

// zip 안 원본 사진 하나: path = photos/{happenedOn}/{photoId}.{ext}, key = R2 원본 키
export type ExportPhotoFile = { path: string; key: string }
export type ExportContent = { manifest: ExportManifestV1; files: ExportPhotoFile[] }

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

const iso = (date: Date | null): string | null => date?.toISOString() ?? null

const toCustomItem = ({ id, title, date }: { id: string; title: string; date: Date }) => ({
  id,
  refKey: `custom:${id}`,
  kind: 'CUSTOM' as const,
  title,
  date: fromDbDate(date),
})

// 요청자에게 위치 동의가 없으면 좌표를 뺀다(보수적 결정). 원본 사진의 EXIF(GPS 포함)는 원본을 그대로 돌려준다는 약속이라 손대지 않는다
const toPlace =
  (includeCoordinates: boolean) =>
  ({ id, name, lat, lng, kakaoPlaceId, address, createdAt }: Place) => ({
    id,
    name,
    ...(includeCoordinates ? { lat, lng } : {}),
    kakaoPlaceId,
    address,
    createdAt: createdAt.toISOString(),
  })

const toBucketItem = ({ id, title, doneAt, entryId, createdAt }: BucketItem) => ({
  id,
  title,
  doneAt: iso(doneAt),
  entryId,
  createdAt: createdAt.toISOString(),
})

// 스크린샷 키는 넣지 않는다(이미지 내보내기는 Phase 4에서 결정)
const toQuote = ({ id, source, text, speakerLabel, saidAt, memo, createdAt }: Quote) => ({
  id,
  source,
  text,
  speakerLabel,
  saidAt: iso(saidAt),
  memo,
  createdAt: createdAt.toISOString(),
})

type EntryRow = Awaited<ReturnType<ExportManifestBuilder['findEntries']>>[number]

const toDiary = (entry: EntryRow) => {
  const happenedOn = fromDbDate(entry.happenedOn)
  const photos = entry.photos.map((photo) => ({
    id: photo.id,
    path: `photos/${happenedOn}/${photo.id}.${EXTENSIONS[photo.originalMime] ?? 'bin'}`,
    takenAt: iso(photo.takenAt),
    key: photo.originalKey,
  }))
  return {
    item: {
      id: entry.id,
      kind: entry.kind,
      happenedOn,
      title: entry.title,
      body: entry.body,
      placeId: entry.placeId,
      photos: photos.map(({ id, path, takenAt }) => ({ id, path, takenAt })),
    },
    files: photos.map(({ path, key }) => ({ path, key })),
  }
}

// entries.json(ExportManifestV1)과 담을 원본 목록을 만든다. 모든 조회는 coupleId 조건. 사진은 READY만.
// 장소 좌표는 요청자(requestedById)의 위치 동의가 있을 때만 담는다
@Injectable()
export class ExportManifestBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentService,
  ) {}

  async build(coupleId: string, requestedById: string, now: Date): Promise<ExportContent> {
    const [couple, entries, anniversaries, places, bucket, quotes, hasLocationConsent] = await Promise.all([
      this.prisma.couple.findFirstOrThrow({
        where: { id: coupleId },
        select: {
          startedOn: true,
          members: { select: { user: { select: { displayName: true } } }, orderBy: { slot: 'asc' } },
        },
      }),
      this.findEntries(coupleId),
      this.prisma.anniversary.findMany({ where: { coupleId }, orderBy: [{ date: 'asc' }, { id: 'asc' }] }),
      this.prisma.place.findMany({ where: { coupleId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.bucketItem.findMany({ where: { coupleId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.quote.findMany({ where: { coupleId }, orderBy: { createdAt: 'asc' } }),
      this.consents.hasLocationConsent(requestedById),
    ])
    const diary = entries.map(toDiary)
    const manifest = exportManifestV1Schema.parse({
      v: 1,
      exportedAt: now.toISOString(),
      couple: {
        startedOn: couple.startedOn ? fromDbDate(couple.startedOn) : null,
        names: couple.members.flatMap(({ user }) => (user.displayName ? [user.displayName] : [])),
      },
      diary: diary.map(({ item }) => item),
      anniversaries: anniversaries.map(toCustomItem),
      places: places.map(toPlace(hasLocationConsent)),
      bucket: bucket.map(toBucketItem),
      quotes: quotes.map(toQuote),
    })
    return { manifest, files: diary.flatMap(({ files }) => files) }
  }

  findEntries(coupleId: string) {
    return this.prisma.diaryEntry.findMany({
      where: { coupleId },
      orderBy: [{ happenedOn: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        kind: true,
        happenedOn: true,
        title: true,
        body: true,
        placeId: true,
        photos: {
          where: { status: 'READY' },
          orderBy: [{ takenAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
          select: { id: true, takenAt: true, originalKey: true, originalMime: true },
        },
      },
    })
  }
}
