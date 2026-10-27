import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  type CreatePhotoUploadRequest,
  type CreatePhotoUploadResponse,
  type CursorPage,
  type CursorQuery,
  MAX_PHOTOS_PER_ENTRY,
  type OriginalMime,
  originalMimeSchema,
  type Photo,
  type PhotoOriginalResponse,
} from '@you-in-heart/shared'
import { ENTRY_PHOTO_SELECT, type EntryPhotoRow, toPhoto } from '../diary/diary-mapper'
import { lockEntry } from '../diary/entry-lock'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage'
import { photoDisplayKey, photoIncomingKey, photoOriginalKey, photoThumbKey } from '../storage/storage-keys'
import { ConsentService } from '../users/consent.service'
import { ImageSanitizer, InvalidImageError, SanitizerBusyError } from './image-sanitizer'
import {
  alreadyComplete,
  entryNotFound,
  invalidCursor,
  invalidUpload,
  locationConsentRequired,
  notEntryAuthor,
  notPhotoUploader,
  originalTooLarge,
  photoLimitReached,
  photoNotFound,
  sanitizerBusy,
  takenAtInFuture,
  uploadIncomplete,
} from './photo-errors'
import { MAGIC_BYTES, matchesOriginalMime } from './photo-magic'

// presign TTL(초): PUT 5분, 목록 썸네일·표시용 1시간, 원본 5분(architecture §6.2)
export const PUT_TTL_SECONDS = 300
export const VIEW_TTL_SECONDS = 3600
export const ORIGINAL_TTL_SECONDS = 300
// 원본은 디코딩하지 않으므로 메모리와 무관. 저장 비용 폭주만 막는다
const MAX_ORIGINAL_BYTES = 200 * 1024 * 1024
// 표시용 후보(기기에서 긴 변 2048 JPEG)는 통째로 읽어 재인코딩한다 → 메모리 상한
const MAX_DISPLAY_CANDIDATE_BYTES = 15 * 1024 * 1024
// 기기 시계 오차 허용
const FUTURE_SKEW_MS = 10 * 60_000

const PHOTO_ROW_SELECT = { ...ENTRY_PHOTO_SELECT, originalKey: true, originalBytes: true, originalMime: true }
type PhotoRow = Prisma.PhotoGetPayload<{ select: typeof PHOTO_ROW_SELECT }>

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

// 사진 1장의 모든 객체(원본·표시용 후보·표시용·썸네일). 일기 삭제·고아 정리에서 함께 지운다
export const photoObjectKeys = (coupleId: string, photoId: string): string[] => [
  photoOriginalKey(coupleId, photoId),
  photoIncomingKey(coupleId, photoId),
  photoDisplayKey(coupleId, photoId),
  photoThumbKey(coupleId, photoId),
]

// 모든 함수의 첫 인자는 CoupleGuard의 coupleId. 업로더는 요청한 멤버
@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: ConsentService,
    private readonly sanitizer: ImageSanitizer,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  // 좌표가 있을 때만 위치 동의를 요구한다(@RequiresLocationConsent는 라우트 단위라 "좌표가 있으면"을 표현하지 못한다)
  async createUpload(
    coupleId: string,
    actorId: string,
    body: CreatePhotoUploadRequest,
  ): Promise<CreatePhotoUploadResponse> {
    if (body.originalBytes > MAX_ORIGINAL_BYTES) throw originalTooLarge()
    if (body.takenAt && Date.parse(body.takenAt) > Date.now() + FUTURE_SKEW_MS) throw takenAtInFuture()
    if (body.lat !== undefined && !(await this.consents.hasLocationConsent(actorId))) throw locationConsentRequired()
    const photoId = await this.prisma.$transaction((tx) => this.insertPending(tx, coupleId, actorId, body))
    return this.presignUploads(coupleId, photoId, body.originalMime, body.originalBytes)
  }

  // PUT URL이 만료된 PENDING 사진을 이어 올린다. 서명 헤더는 처음 선언(저장된 mime·바이트 수) 그대로
  async renewUpload(coupleId: string, actorId: string, id: string): Promise<CreatePhotoUploadResponse> {
    const photo = await this.findPhoto(coupleId, id)
    if (photo.uploaderId !== actorId) throw notPhotoUploader()
    if (photo.status === 'READY') throw alreadyComplete()
    return this.presignUploads(coupleId, id, originalMimeSchema.parse(photo.originalMime), photo.originalBytes)
  }

  // 원본: HEAD 크기 + 매직 넘버만. 표시용 후보: 재인코딩(EXIF 제거) → d.jpg·t.jpg → incoming 삭제 → READY. 다시 불러도 같은 결과
  async complete(coupleId: string, id: string): Promise<Photo> {
    const photo = await this.findPhoto(coupleId, id)
    if (photo.status === 'READY') return this.signPhoto(photo)
    await this.verifyOriginal(photo)
    const size = await this.writeVariants(coupleId, id)
    const { count } = await this.prisma.photo.updateMany({
      where: { id, coupleId, status: 'PENDING' },
      data: {
        status: 'READY',
        displayKey: photoDisplayKey(coupleId, id),
        thumbKey: photoThumbKey(coupleId, id),
        ...size,
      },
    })
    if (count === 0) return this.afterLostRace(coupleId, id)
    await this.deleteObjects([photoIncomingKey(coupleId, id)])
    return this.signPhoto(await this.findPhoto(coupleId, id))
  }

  // 앨범: READY만, takenAt desc(없으면 뒤로), id desc
  async list(coupleId: string, { cursor, limit }: CursorQuery): Promise<CursorPage<Photo>> {
    const after = cursor ? await this.findCursor(coupleId, cursor) : null
    const rows = await this.prisma.photo.findMany({
      where: { coupleId, status: 'READY', ...(after ? { OR: afterCursor(after) } : {}) },
      orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      take: limit + 1,
      select: ENTRY_PHOTO_SELECT,
    })
    const page = rows.slice(0, limit)
    return { items: await this.toPhotos(page), nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null }
  }

  async get(coupleId: string, id: string): Promise<Photo> {
    return this.signPhoto(await this.findPhoto(coupleId, id))
  }

  // 원본은 목록·뷰어에서 서명하지 않는다. "원본 저장"만 5분 URL
  async originalUrl(coupleId: string, id: string): Promise<PhotoOriginalResponse> {
    const photo = await this.findPhoto(coupleId, id)
    if (photo.status !== 'READY') throw photoNotFound()
    const mime = originalMimeSchema.parse(photo.originalMime)
    return {
      url: await this.storage.presignGet(photo.originalKey, ORIGINAL_TTL_SECONDS),
      expiresIn: ORIGINAL_TTL_SECONDS,
      mime,
    }
  }

  // 일기 응답용: 썸네일·표시용만 1시간 서명
  toPhotos(rows: readonly EntryPhotoRow[]): Promise<Photo[]> {
    return Promise.all(rows.map((row) => this.signPhoto(row)))
  }

  // 삭제 실패는 요청을 실패시키지 않는다. 남은 객체는 커플 purge가 접두사째 지운다
  async deleteObjects(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return
    try {
      await this.storage.deleteObjects(keys)
    } catch (error) {
      this.logger.error(`[photos] object delete failed (${keys.length}건, ${errorName(error)})`)
    }
  }

  // 일반 일기는 작성자만, AUTO_DAY("그날의 사진")는 두 멤버 모두 올린다. 일기 행을 잠가 20장 상한 경쟁을 막는다
  private async insertPending(
    tx: Prisma.TransactionClient,
    coupleId: string,
    actorId: string,
    { entryId, originalMime, originalBytes, takenAt, lat, lng }: CreatePhotoUploadRequest,
  ): Promise<string> {
    const entry = await tx.diaryEntry.findFirst({
      where: { id: entryId, coupleId },
      select: { kind: true, authorId: true },
    })
    if (!entry) throw entryNotFound()
    if (entry.kind === 'MANUAL' && entry.authorId !== actorId) throw notEntryAuthor()
    if (!(await lockEntry(tx, coupleId, entryId))) throw entryNotFound()
    if ((await tx.photo.count({ where: { coupleId, entryId } })) >= MAX_PHOTOS_PER_ENTRY) {
      throw photoLimitReached(MAX_PHOTOS_PER_ENTRY)
    }
    const { id } = await tx.photo.create({
      data: {
        coupleId,
        entryId,
        uploaderId: actorId,
        originalKey: '',
        originalBytes,
        originalMime,
        takenAt: takenAt ? new Date(takenAt) : null,
        lat: lat ?? null,
        lng: lng ?? null,
      },
      select: { id: true },
    })
    await tx.photo.updateMany({ where: { id, coupleId }, data: { originalKey: photoOriginalKey(coupleId, id) } })
    return id
  }

  private async presignUploads(
    coupleId: string,
    photoId: string,
    mime: OriginalMime,
    bytes: number,
  ): Promise<CreatePhotoUploadResponse> {
    const [original, display] = await Promise.all([
      this.storage.presignPut({
        key: photoOriginalKey(coupleId, photoId),
        contentType: mime,
        contentLength: bytes,
        expiresIn: PUT_TTL_SECONDS,
      }),
      this.storage.presignPut({
        key: photoIncomingKey(coupleId, photoId),
        contentType: 'image/jpeg',
        expiresIn: PUT_TTL_SECONDS,
      }),
    ])
    return {
      photoId,
      original: { url: original, headers: { 'Content-Type': mime, 'Content-Length': String(bytes) } },
      display: { url: display, headers: { 'Content-Type': 'image/jpeg' } },
      expiresIn: PUT_TTL_SECONDS,
    }
  }

  private async verifyOriginal(photo: PhotoRow): Promise<void> {
    const head = await this.storage.head(photo.originalKey)
    if (!head) throw uploadIncomplete()
    if (head.size !== photo.originalBytes) throw invalidUpload('원본 크기가 요청과 달라요')
    const mime = originalMimeSchema.safeParse(photo.originalMime)
    const magic = await this.storage.getObjectRange(photo.originalKey, MAGIC_BYTES)
    if (!mime.success || !magic || !matchesOriginalMime(magic, mime.data)) {
      throw invalidUpload('원본 형식이 올바르지 않아요')
    }
  }

  private async writeVariants(coupleId: string, id: string): Promise<{ width: number; height: number }> {
    const incomingKey = photoIncomingKey(coupleId, id)
    const head = await this.storage.head(incomingKey)
    if (!head) throw uploadIncomplete()
    if (head.size > MAX_DISPLAY_CANDIDATE_BYTES) throw invalidUpload('표시용 이미지가 너무 커요')
    const input = await this.storage.getObject(incomingKey)
    if (!input) throw uploadIncomplete()
    const { display, thumb } = await this.sanitizer.sanitize(input).catch((error: unknown) => {
      if (error instanceof SanitizerBusyError) throw sanitizerBusy()
      if (error instanceof InvalidImageError) throw invalidUpload('표시용 이미지를 읽을 수 없어요')
      throw error
    })
    await Promise.all([
      this.storage.putObject({ key: photoDisplayKey(coupleId, id), body: display.buffer, contentType: 'image/jpeg' }),
      this.storage.putObject({ key: photoThumbKey(coupleId, id), body: thumb.buffer, contentType: 'image/jpeg' }),
    ])
    return { width: display.width, height: display.height }
  }

  // 동시 complete가 먼저 READY로 바꿨으면 그 결과를, 그 사이 행이 지워졌으면(일기 삭제·고아 정리) 방금 쓴 객체를 지우고 404
  private async afterLostRace(coupleId: string, id: string): Promise<Photo> {
    const row = await this.prisma.photo.findFirst({ where: { id, coupleId }, select: PHOTO_ROW_SELECT })
    if (row?.status === 'READY') return this.signPhoto(row)
    await this.deleteObjects(photoObjectKeys(coupleId, id))
    throw photoNotFound()
  }

  private async findPhoto(coupleId: string, id: string): Promise<PhotoRow> {
    const row = await this.prisma.photo.findFirst({ where: { id, coupleId }, select: PHOTO_ROW_SELECT })
    if (!row) throw photoNotFound()
    return row
  }

  private async findCursor(coupleId: string, cursor: string): Promise<{ id: string; takenAt: Date | null }> {
    const row = await this.prisma.photo.findFirst({
      where: { id: cursor, coupleId, status: 'READY' },
      select: { id: true, takenAt: true },
    })
    if (!row) throw invalidCursor()
    return row
  }

  private async signPhoto(row: EntryPhotoRow): Promise<Photo> {
    const sign = (key: string | null) => (key ? this.storage.presignGet(key, VIEW_TTL_SECONDS) : Promise.resolve(null))
    const [thumbUrl, displayUrl] = await Promise.all([sign(row.thumbKey), sign(row.displayKey)])
    return toPhoto(row, { thumbUrl, displayUrl })
  }
}

// (takenAt desc nulls last, id desc) 순서에서 커서 다음 행들
const afterCursor = ({ id, takenAt }: { id: string; takenAt: Date | null }): Prisma.PhotoWhereInput[] =>
  takenAt
    ? [{ takenAt: { lt: takenAt } }, { takenAt, id: { lt: id } }, { takenAt: null }]
    : [{ takenAt: null, id: { lt: id } }]
