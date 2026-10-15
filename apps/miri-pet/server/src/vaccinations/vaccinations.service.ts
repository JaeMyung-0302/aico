import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import {
  CERTIFICATE_URL_TTL_SECONDS,
  type CertificateUrl,
  type CreateVaccinationRequest,
  CUSTOM_NAME_REQUIRED_MESSAGE,
  isNextDueOnValid,
  NEXT_DUE_BEFORE_ADMINISTERED_MESSAGE,
  type UpcomingVaccination,
  type UpdateVaccinationRequest,
  type Vaccination as VaccinationDto,
  type WithdrawCertificateConsentResponse,
} from '@miri-pet/shared'
import { isUniqueViolation } from '../common/prisma/prisma-errors'
import { EventsService } from '../events/events.service'
import type { Vaccination } from '../generated/prisma'
import { MEDIA_NOT_USABLE, MediaService } from '../media/media.service'
import { collectVaccinationMedia, deleteMediaRows } from '../pets/pet-media'
import { PetsService } from '../pets/pets.service'
import { PrismaService } from '../prisma/prisma.service'
import { daysBetween, fromDbDate, kstToday, toDbDate } from './kst-date'

type VaccinationWithCount = Vaccination & { _count: { certificates: number } }

const WITH_COUNT = { _count: { select: { certificates: true } } } as const

const vaccinationNotFound = () => new NotFoundException('접종 기록을 찾을 수 없어요')

const mediaNotUsable = () =>
  new UnprocessableEntityException({ code: MEDIA_NOT_USABLE, message: '사용할 수 없는 증명서 이미지예요' })

// ZodValidationPipe와 같은 400 형식
const validationError = (path: string, message: string) =>
  new BadRequestException({ statusCode: 400, message: 'Validation failed', in: 'body', issues: [{ path, message }] })

export const toVaccinationDto = (vaccination: VaccinationWithCount): VaccinationDto => ({
  id: vaccination.id,
  petId: vaccination.petId,
  type: vaccination.type,
  customName: vaccination.customName,
  administeredOn: fromDbDate(vaccination.administeredOn),
  clinicName: vaccination.clinicName,
  nextDueOn: vaccination.nextDueOn ? fromDbDate(vaccination.nextDueOn) : null,
  certificateCount: vaccination._count.certificates,
})

@Injectable()
export class VaccinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
    private readonly media: MediaService,
    private readonly events: EventsService,
  ) {}

  async list(ownerId: string, petId: string): Promise<VaccinationDto[]> {
    await this.pets.findOwned(ownerId, petId)
    const rows = await this.prisma.vaccination.findMany({
      where: { petId },
      include: WITH_COUNT,
      orderBy: [{ administeredOn: 'desc' }, { id: 'desc' }],
    })
    return rows.map(toVaccinationDto)
  }

  async create(ownerId: string, petId: string, body: CreateVaccinationRequest): Promise<VaccinationDto> {
    await this.pets.findOwned(ownerId, petId)
    await this.assertCertificatesUsable(ownerId, body.certificateMediaIds)
    try {
      const created = await this.prisma.vaccination.create({
        data: {
          petId,
          type: body.type,
          customName: body.type === 'ETC' ? (body.customName ?? null) : null,
          administeredOn: toDbDate(body.administeredOn),
          clinicName: body.clinicName || null,
          nextDueOn: body.nextDueOn ? toDbDate(body.nextDueOn) : null,
          certificates: { create: body.certificateMediaIds.map((mediaId) => ({ mediaId })) },
        },
        include: WITH_COUNT,
      })
      this.events.capture(ownerId, 'vaccination_created', {
        type: created.type,
        hasCertificate: body.certificateMediaIds.length > 0,
        hasNextDue: created.nextDueOn !== null,
      })
      return toVaccinationDto(created)
    } catch (error) {
      // 같은 증명서를 동시에 두 기록에 붙이려는 경우(VaccinationCertificate.mediaId unique)
      if (isUniqueViolation(error)) throw mediaNotUsable()
      throw error
    }
  }

  // 기존 값과 합친 뒤 교차 검증한다 → nextDueOn을 바꾸면 다음 리마인더 실행이 새 날짜로 집계한다(D6)
  async update(ownerId: string, id: string, body: UpdateVaccinationRequest): Promise<VaccinationDto> {
    const current = await this.findOwned(ownerId, id)
    const type = body.type ?? current.type
    const customName = body.customName !== undefined ? body.customName || null : current.customName
    const administeredOn = body.administeredOn ?? fromDbDate(current.administeredOn)
    const nextDueOn =
      body.nextDueOn !== undefined ? body.nextDueOn : current.nextDueOn ? fromDbDate(current.nextDueOn) : null
    if (type === 'ETC' && !customName) throw validationError('customName', CUSTOM_NAME_REQUIRED_MESSAGE)
    if (!isNextDueOnValid(administeredOn, nextDueOn)) {
      throw validationError('nextDueOn', NEXT_DUE_BEFORE_ADMINISTERED_MESSAGE)
    }
    const updated = await this.prisma.vaccination.update({
      where: { id },
      data: {
        type,
        customName: type === 'ETC' ? customName : null,
        administeredOn: toDbDate(administeredOn),
        ...(body.clinicName !== undefined ? { clinicName: body.clinicName || null } : {}),
        nextDueOn: nextDueOn ? toDbDate(nextDueOn) : null,
      },
      include: WITH_COUNT,
    })
    return toVaccinationDto(updated)
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.findOwned(ownerId, id)
    const media = await this.prisma.$transaction(async (tx) => {
      const owned = await collectVaccinationMedia(tx, id)
      await tx.vaccination.delete({ where: { id } })
      await deleteMediaRows(tx, owned)
      return owned
    })
    await this.media.purgeMedia(media)
  }

  // 홈 D-day 배너: KST 오늘 이후(오늘 포함) 가장 가까운 다음 접종 1건
  async upcoming(ownerId: string, now: Date = new Date()): Promise<UpcomingVaccination | null> {
    const today = kstToday(now)
    const next = await this.prisma.vaccination.findFirst({
      where: { pet: { ownerId }, nextDueOn: { gte: toDbDate(today) } },
      include: { ...WITH_COUNT, pet: { select: { id: true, name: true } } },
      orderBy: [{ nextDueOn: 'asc' }, { id: 'asc' }],
    })
    if (!next?.nextDueOn) return null
    const { pet, ...vaccination } = next
    return { vaccination: toVaccinationDto(vaccination), pet, dDay: daysBetween(today, fromDbDate(next.nextDueOn)) }
  }

  // 증명서 열람: 소유자만(다른 사용자 403) → 60초 presigned GET + 열람 로그
  async certificates(viewerId: string, id: string): Promise<CertificateUrl[]> {
    const vaccination = await this.prisma.vaccination.findUnique({
      where: { id },
      select: {
        pet: { select: { ownerId: true } },
        certificates: { select: { media: { select: { id: true, key: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!vaccination) throw vaccinationNotFound()
    if (vaccination.pet.ownerId !== viewerId) throw new ForbiddenException('본인 펫의 증명서만 볼 수 있어요')

    const media = vaccination.certificates.map((certificate) => certificate.media)
    const expiresAt = new Date(Date.now() + CERTIFICATE_URL_TTL_SECONDS * 1000).toISOString()
    const urls = await Promise.all(
      media.map(async ({ id: mediaId, key }) => ({
        mediaId,
        url: await this.media.presignCertificate(key, CERTIFICATE_URL_TTL_SECONDS),
        expiresAt,
      })),
    )
    if (media.length > 0) {
      await this.prisma.mediaAccessLog.createMany({
        data: media.map(({ id: mediaId }) => ({ userId: viewerId, mediaId })),
      })
    }
    return urls
  }

  // 증명서 사진 보관 별도 동의. 이미 유효한 동의가 있으면 그대로 둔다(멱등)
  async agreeCertificateConsent(userId: string, version: string): Promise<void> {
    const existing = await this.prisma.consent.findFirst({
      where: { userId, kind: 'CERTIFICATE', withdrawnAt: null },
      select: { id: true },
    })
    if (existing) return
    await this.prisma.consent.create({ data: { userId, kind: 'CERTIFICATE', version } })
  }

  // 보안 리뷰 L2: 철회 시 유효한 동의를 모두 닫고 내 CERTIFICATE Media 전부를 지운다(VaccinationCertificate는 cascade).
  // R2 객체는 커밋 뒤(실패는 로그). 접종 기록은 그대로 둔다
  async withdrawCertificateConsent(
    userId: string,
    now: Date = new Date(),
  ): Promise<WithdrawCertificateConsentResponse> {
    const removed = await this.prisma.$transaction(async (tx) => {
      await tx.consent.updateMany({
        where: { userId, kind: 'CERTIFICATE', withdrawnAt: null },
        data: { withdrawnAt: now },
      })
      const media = await tx.media.findMany({
        where: { ownerId: userId, purpose: 'CERTIFICATE' },
        select: { id: true, ownerId: true, bucket: true, key: true, status: true },
      })
      await deleteMediaRows(tx, media)
      return media
    })
    await this.media.purgeOwnedMedia(removed)
    return { withdrawnAt: now.toISOString(), deletedCertificateCount: removed.length }
  }

  private async findOwned(ownerId: string, id: string): Promise<Vaccination> {
    const vaccination = await this.prisma.vaccination.findFirst({ where: { id, pet: { ownerId } } })
    if (!vaccination) throw vaccinationNotFound()
    return vaccination
  }

  // 내 READY 증명서 이미지 + 아직 다른 기록에 붙지 않은 것만
  private async assertCertificatesUsable(ownerId: string, mediaIds: readonly string[]): Promise<void> {
    if (mediaIds.length === 0) return
    await this.media.assertUsable(ownerId, mediaIds, 'CERTIFICATE')
    const attached = await this.prisma.vaccinationCertificate.count({ where: { mediaId: { in: [...mediaIds] } } })
    if (attached > 0) throw mediaNotUsable()
  }
}
