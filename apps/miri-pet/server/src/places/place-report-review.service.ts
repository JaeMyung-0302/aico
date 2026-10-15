import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreatePlaceReportRequest, PlaceReportKind } from '@miri-pet/shared'
import type { Media, PlaceReport, Prisma } from '../generated/prisma'
import { MediaService } from '../media/media.service'
import { PrismaService } from '../prisma/prisma.service'
import { parseReportPayload } from './place-report-payload'

export type PendingPlaceReportRow = {
  id: string
  createdAt: Date
  kind: PlaceReportKind
  placeId: string | null
  reporterId: string | null
  summary: string
  // 첨부 사진마다 운영자용 presigned GET URL(짧게 만료)
  imageUrls: string[]
}

// 운영자가 CLI 출력에서 바로 열어 볼 시간만큼만
export const PLACE_REPORT_IMAGE_URL_TTL_SECONDS = 60

type MediaRow = Pick<Media, 'id' | 'bucket' | 'key' | 'status'>

type Tx = Prisma.TransactionClient
type Decision = 'APPROVED' | 'REJECTED'

// 제보 payload를 장소에 반영하고 장소 id를 돌려준다. 반영 시각 = 최종 확인일
const applyPayload = async (tx: Tx, report: PlaceReport, payload: CreatePlaceReportRequest): Promise<string> => {
  const verifiedAt = new Date()
  if (payload.kind === 'NEW') {
    const place = await tx.place.create({
      data: {
        name: payload.name,
        address: payload.address,
        category: payload.category,
        allowedSizes: payload.allowedSizes,
        indoorAllowed: payload.indoorAllowed,
        conditionsNote: payload.conditionsNote ?? null,
        lat: payload.lat,
        lng: payload.lng,
        source: 'USER',
        sourceRef: report.id,
        verifiedAt,
      },
    })
    await tx.placeReport.update({ where: { id: report.id }, data: { placeId: place.id } })
    return place.id
  }
  if (!report.placeId) throw new NotFoundException('대상 장소가 삭제되어 승인할 수 없습니다')
  if (payload.kind === 'CLOSED') {
    await tx.place.update({ where: { id: report.placeId }, data: { status: 'CLOSED', verifiedAt } })
    return report.placeId
  }
  // undefined 필드는 Prisma가 건드리지 않는다 → 보낸 필드만 바뀐다
  await tx.place.update({
    where: { id: report.placeId },
    data: {
      name: payload.name,
      address: payload.address,
      category: payload.category,
      allowedSizes: payload.allowedSizes,
      indoorAllowed: payload.indoorAllowed,
      conditionsNote: payload.conditionsNote,
      verifiedAt,
    },
  })
  return report.placeId
}

@Injectable()
export class PlaceReportReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listPendingReports(limit: number): Promise<PendingPlaceReportRow[]> {
    const rows = await this.prisma.placeReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { images: { orderBy: { order: 'asc' }, select: { media: { select: { key: true } } } } },
    })
    return Promise.all(
      rows.map(async (row) => {
        const payload = parseReportPayload(row.payload)
        return {
          id: row.id,
          createdAt: row.createdAt,
          kind: payload.kind,
          placeId: row.placeId,
          reporterId: row.reporterId,
          summary: JSON.stringify(payload),
          imageUrls: await Promise.all(
            row.images.map(({ media }) => this.media.presignPrivate(media.key, PLACE_REPORT_IMAGE_URL_TTL_SECONDS)),
          ),
        }
      }),
    )
  }

  // 검수가 끝나면 제보 사진(증빙)은 더 필요 없다 → Media 행은 같은 트랜잭션에서, R2 객체는 커밋 뒤 지운다
  async approveReport(reportId: string): Promise<{ placeId: string }> {
    const { placeId, images } = await this.prisma.$transaction(async (tx) => {
      const report = await this.claim(tx, reportId, 'APPROVED')
      const applied = await applyPayload(tx, report, parseReportPayload(report.payload))
      await this.notifyReporter(tx, report)
      return { placeId: applied, images: await this.deleteImages(tx, reportId) }
    })
    await this.media.purgeMedia(images)
    return { placeId }
  }

  async rejectReport(reportId: string): Promise<void> {
    const images = await this.prisma.$transaction(async (tx) => {
      const report = await this.claim(tx, reportId, 'REJECTED')
      await this.notifyReporter(tx, report)
      return this.deleteImages(tx, reportId)
    })
    await this.media.purgeMedia(images)
  }

  // PlaceReportImage 행은 Media 삭제 cascade로 함께 사라진다
  private async deleteImages(tx: Tx, reportId: string): Promise<MediaRow[]> {
    const images = await tx.placeReportImage.findMany({
      where: { reportId },
      select: { media: { select: { id: true, bucket: true, key: true, status: true } } },
    })
    const media = images.map((image) => image.media)
    if (media.length > 0) await tx.media.deleteMany({ where: { id: { in: media.map((row) => row.id) } } })
    return media
  }

  // PENDING → 결정 상태로 조건부 갱신. 동시에 두 번 처리해도 한 쪽만 성공한다(행 잠금 후 재평가)
  private async claim(tx: Tx, reportId: string, decision: Decision): Promise<PlaceReport> {
    const { count } = await tx.placeReport.updateMany({
      where: { id: reportId, status: 'PENDING' },
      data: { status: decision, reviewedAt: new Date() },
    })
    const report = await tx.placeReport.findUnique({ where: { id: reportId } })
    if (!report) throw new NotFoundException(`제보 ${reportId}를 찾을 수 없습니다`)
    if (count === 0) throw new ConflictException(`이미 처리된 제보입니다 (${report.status})`)
    return report
  }

  // 탈퇴한 제보자(reporterId null)에게는 알리지 않는다
  private async notifyReporter(tx: Tx, report: PlaceReport): Promise<void> {
    if (!report.reporterId) return
    await tx.notification.create({
      data: { userId: report.reporterId, kind: 'PLACE_REPORT_REVIEWED', refId: report.id },
    })
  }
}
