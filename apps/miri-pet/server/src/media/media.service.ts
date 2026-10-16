import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CERTIFICATE_CONSENT_REQUIRED_CODE,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type Media as MediaDto,
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_TTL_SECONDS,
} from '@miri-pet/shared'
import type { Media, MediaPurpose } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { ImageSanitizer, InvalidImageError, type SanitizedImage, SanitizerBusyError } from './image-sanitizer'
import {
  allObjectsOf,
  certificateKey,
  incomingKeyOf,
  newMediaId,
  placeReportKey,
  publicMainKey,
  publicThumbKey,
  publicUrlsOf,
  storedObjectsOf,
} from './media-keys'
import { OBJECT_STORAGE, type ObjectStorage, type StoredObject } from './object-storage'

// 공개 이미지는 키가 바뀌지 않으므로(재업로드 = 새 mediaId) 영구 캐시
const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export const MEDIA_NOT_USABLE = 'MEDIA_NOT_USABLE'
export const TOO_MANY_PENDING_UPLOADS = 'TOO_MANY_PENDING_UPLOADS'
export const MEDIA_BUSY = 'MEDIA_BUSY'
// 사용자당 아직 complete되지 않은 업로드 상한(미완료 원본이 incoming/에 쌓이는 양을 묶는다). 정리 크론이 24시간 뒤 지운다
export const MAX_PENDING_UPLOADS = 20

// 공개 URL이 없는 용도: 증명서(민감 정보) · 장소 제보 사진(운영자 검수용 증빙)
const PRIVATE_PURPOSES: ReadonlySet<MediaPurpose> = new Set(['CERTIFICATE', 'PLACE_REPORT'])

type MediaRow = Pick<Media, 'id' | 'bucket' | 'key' | 'status'>
export type OwnedMediaRow = MediaRow & Pick<Media, 'ownerId'>

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)
  private readonly publicBaseUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly sanitizer: ImageSanitizer,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    config: ConfigService,
  ) {
    this.publicBaseUrl = config.get<string>('r2.publicBaseUrl') ?? ''
  }

  // ① PENDING 행 + private incoming/ 에 5분짜리 presigned PUT
  async createUpload(ownerId: string, { purpose, mime, bytes }: CreateUploadRequest): Promise<CreateUploadResponse> {
    if (purpose === 'CERTIFICATE') await this.assertCertificateConsent(ownerId)
    await this.assertPendingCapacity(ownerId)
    const id = newMediaId()
    const media = await this.prisma.media.create({
      data: {
        id,
        ownerId,
        purpose,
        bucket: PRIVATE_PURPOSES.has(purpose) ? 'PRIVATE' : 'PUBLIC',
        key: incomingKeyOf(id),
        mime,
        bytes,
      },
    })
    const uploadUrl = await this.storage.presignPut({
      bucket: 'PRIVATE',
      key: media.key,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    })
    return {
      mediaId: media.id,
      uploadUrl,
      headers: { 'Content-Type': mime },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    }
  }

  // ③ 서버 재인코딩(EXIF 제거) → 최종 위치에 저장 → incoming 삭제 → READY. 다시 불러도 같은 결과
  async complete(ownerId: string, mediaId: string): Promise<MediaDto> {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, ownerId } })
    if (!media) throw new NotFoundException('미디어를 찾을 수 없어요')
    if (media.status !== 'PENDING') {
      // presigned PUT(5분)이 complete 뒤에 또 쓰였을 수 있다 → 재호출마다 incoming을 다시 지운다(멱등).
      // 아무도 complete를 다시 부르지 않는 경우는 R2 수명 주기 규칙(incoming/ 1일 만료)이 맡는다
      await this.purgeObjects([{ bucket: 'PRIVATE', key: incomingKeyOf(media.id) }])
      if (media.status === 'REJECTED') throw invalidImage()
      return this.toDto(media)
    }

    const original = await this.storage.getObject({ bucket: 'PRIVATE', key: media.key })
    if (!original) throw new ConflictException({ code: 'UPLOAD_NOT_FOUND', message: '업로드가 아직 끝나지 않았어요' })

    if (original.length > MAX_UPLOAD_BYTES) await this.reject(media, uploadTooLarge())
    const sanitized = await this.sanitizeOrReject(media, original)
    const finalKey = await this.store(media, sanitized)
    const claimed = await this.prisma.media.updateMany({
      where: { id: media.id, status: 'PENDING' },
      data: {
        status: 'READY',
        key: finalKey,
        mime: 'image/jpeg',
        width: sanitized.main.width,
        height: sanitized.main.height,
        bytes: sanitized.main.buffer.length,
      },
    })
    if (claimed.count > 0) await this.purgeObjects([{ bucket: 'PRIVATE', key: media.key }])
    return this.toDto(await this.prisma.media.findUniqueOrThrow({ where: { id: media.id } }))
  }

  // 다른 기능(펫 사진·증명서)이 붙이기 전 검증: 내 것 + READY + 용도 일치 + 아직 어디에도 안 붙음은 호출 쪽 조건으로
  async assertUsable(ownerId: string, mediaIds: readonly string[], purpose: MediaPurpose): Promise<void> {
    if (mediaIds.length === 0) return
    const count = await this.prisma.media.count({
      where: { id: { in: [...mediaIds] }, ownerId, purpose, status: 'READY' },
    })
    if (count !== new Set(mediaIds).size) {
      throw new UnprocessableEntityException({ code: MEDIA_NOT_USABLE, message: '사용할 수 없는 이미지예요' })
    }
  }

  publicThumbUrl(media: MediaRow | null): string | null {
    return media ? publicUrlsOf(this.publicBaseUrl, media).thumbUrl : null
  }

  presignCertificate(key: string, expiresIn: number): Promise<string> {
    return this.storage.presignGet({ bucket: 'PRIVATE', key, expiresIn })
  }

  presignPrivate(key: string, expiresIn: number): Promise<string> {
    return this.storage.presignGet({ bucket: 'PRIVATE', key, expiresIn })
  }

  // DB 커밋 뒤에 호출한다. R2 실패는 로그만 남긴다(운영자가 grep으로 재시도 대상을 찾는다)
  async purgeObjects(objects: readonly StoredObject[]): Promise<void> {
    if (objects.length === 0) return
    try {
      await this.storage.deleteObjects(objects)
    } catch (error) {
      const keys = objects.map((object) => `${object.bucket}:${object.key}`).join(',')
      this.logger.warn(`[media] r2 delete failed ${keys}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  purgeMedia(media: readonly MediaRow[]): Promise<void> {
    return this.purgeObjects(media.flatMap(storedObjectsOf))
  }

  // 상태와 무관하게(PENDING이 최종 위치에 남긴 객체까지) 지운다. 탈퇴·정리 크론용
  purgeOwnedMedia(media: readonly OwnedMediaRow[]): Promise<void> {
    return this.purgeObjects(media.flatMap(allObjectsOf))
  }

  // 교체된 프로필 사진 등: 어디에도 안 붙어 있으면 행을 지우고(커밋) R2 객체를 지운다. 아직 쓰이면 그대로 둔다
  async discardIfUnused(media: MediaRow): Promise<void> {
    const { count } = await this.prisma.media.deleteMany({
      where: {
        id: media.id,
        userAvatar: { is: null },
        petAvatar: { is: null },
        certificate: { is: null },
        postImages: { none: {} },
        messages: { none: {} },
        placeReportImage: { is: null },
      },
    })
    if (count > 0) await this.purgeMedia([media])
  }

  // 증명서는 별도 동의(CERTIFICATE)가 있어야 받는다 (D3)
  private async assertCertificateConsent(userId: string): Promise<void> {
    const consent = await this.prisma.consent.findFirst({
      where: { userId, kind: 'CERTIFICATE', withdrawnAt: null },
      select: { id: true },
    })
    if (!consent) {
      throw new ForbiddenException({
        code: CERTIFICATE_CONSENT_REQUIRED_CODE,
        message: '증명서 사진 보관 동의가 필요해요',
      })
    }
  }

  private async assertPendingCapacity(ownerId: string): Promise<void> {
    const pending = await this.prisma.media.count({ where: { ownerId, status: 'PENDING' } })
    if (pending >= MAX_PENDING_UPLOADS) {
      throw new UnprocessableEntityException({
        code: TOO_MANY_PENDING_UPLOADS,
        message: '아직 끝나지 않은 업로드가 너무 많아요. 잠시 후 다시 시도해 주세요',
      })
    }
  }

  // 거부: REJECTED로 바꾸고 원본(incoming)을 지운 뒤 422를 던진다
  private async reject(media: Media, error: UnprocessableEntityException): Promise<never> {
    await this.prisma.media.update({ where: { id: media.id }, data: { status: 'REJECTED' } })
    await this.purgeObjects([{ bucket: 'PRIVATE', key: media.key }])
    throw error
  }

  private async sanitizeOrReject(media: Media, original: Buffer): Promise<SanitizedImage> {
    try {
      return await this.sanitizer.sanitize(original)
    } catch (error) {
      // 대기열 포화는 이미지 문제가 아니다 → PENDING 유지, 클라이언트가 다시 complete한다
      if (error instanceof SanitizerBusyError) {
        throw new ServiceUnavailableException({
          code: MEDIA_BUSY,
          message: '사진 처리가 밀려 있어요. 잠시 후 다시 시도해 주세요',
        })
      }
      if (!(error instanceof InvalidImageError)) throw error
      return this.reject(media, invalidImage())
    }
  }

  private async store(media: Media, { main, thumb }: SanitizedImage): Promise<string> {
    if (PRIVATE_PURPOSES.has(media.purpose)) {
      const key =
        media.purpose === 'CERTIFICATE'
          ? certificateKey(media.ownerId, media.id)
          : placeReportKey(media.ownerId, media.id)
      await this.storage.putObject({ bucket: 'PRIVATE', key, body: main.buffer, contentType: 'image/jpeg' })
      return key
    }
    const common = { bucket: 'PUBLIC' as const, contentType: 'image/jpeg', cacheControl: PUBLIC_CACHE_CONTROL }
    await Promise.all([
      this.storage.putObject({ ...common, key: publicMainKey(media.id), body: main.buffer }),
      this.storage.putObject({ ...common, key: publicThumbKey(media.id), body: thumb.buffer }),
    ])
    return publicMainKey(media.id)
  }

  private toDto(media: Media): MediaDto {
    return {
      id: media.id,
      status: media.status,
      ...publicUrlsOf(this.publicBaseUrl, media),
      width: media.width,
      height: media.height,
    }
  }
}

const uploadTooLarge = () =>
  new UnprocessableEntityException({ code: 'UPLOAD_TOO_LARGE', message: '사진 용량이 너무 커요(최대 15MB)' })

const invalidImage = () =>
  new UnprocessableEntityException({ code: 'INVALID_IMAGE', message: '이미지 파일을 읽을 수 없어요' })
