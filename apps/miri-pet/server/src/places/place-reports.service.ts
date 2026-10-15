import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import type { CreatePlaceReportRequest, MyPlaceReport } from '@miri-pet/shared'
import { isForeignKeyViolation, uniqueViolationTargets } from '../common/prisma/prisma-errors'
import { MEDIA_NOT_USABLE, MediaService } from '../media/media.service'
import { PrismaService } from '../prisma/prisma.service'
import { parseReportPayload, payloadName } from './place-report-payload'
import { PlacesService } from './places.service'

const MY_REPORTS_LIMIT = 50
const DELETED_PLACE_NAME = '삭제된 장소'

const mediaNotUsable = () =>
  new UnprocessableEntityException({ code: MEDIA_NOT_USABLE, message: '사용할 수 없는 이미지예요' })

@Injectable()
export class PlaceReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly places: PlacesService,
    private readonly media: MediaService,
  ) {}

  // 운영자 검수 전까지 PENDING. 장소에는 승인 때만 반영된다
  // 안내문 사진(선택): 내 것 + READY + PLACE_REPORT 용도 + 아직 어떤 제보에도 안 붙음. payload가 아닌 PlaceReportImage에 저장
  async create(reporterId: string, body: CreatePlaceReportRequest): Promise<{ id: string; status: 'PENDING' }> {
    const { mediaIds = [], ...payload } = body
    if (payload.kind !== 'NEW') await this.places.assertActive(payload.placeId)
    await this.media.assertUsable(reporterId, mediaIds, 'PLACE_REPORT')
    if ((await this.prisma.placeReportImage.count({ where: { mediaId: { in: mediaIds } } })) > 0) throw mediaNotUsable()
    const report = await this.prisma.placeReport
      .create({
        data: {
          reporterId,
          placeId: payload.kind === 'NEW' ? null : payload.placeId,
          payload,
          images: { create: mediaIds.map((mediaId, order) => ({ mediaId, order })) },
        },
        select: { id: true },
      })
      .catch((error: unknown) => {
        // 동시 제보로 같은 사진이 다른 제보에 먼저 붙었다(PlaceReportImage.mediaId 유니크)
        if (uniqueViolationTargets(error).includes('mediaId')) throw mediaNotUsable()
        // 검사 직후 정리 크론이 24시간 지난 미첨부 사진을 지웠다
        if (isForeignKeyViolation(error)) throw mediaNotUsable()
        throw error
      })
    return { id: report.id, status: 'PENDING' }
  }

  async listMine(reporterId: string): Promise<{ items: MyPlaceReport[] }> {
    const rows = await this.prisma.placeReport.findMany({
      where: { reporterId },
      orderBy: { id: 'desc' },
      take: MY_REPORTS_LIMIT,
      include: { place: { select: { name: true } } },
    })
    return {
      items: rows.map((row) => {
        const payload = parseReportPayload(row.payload)
        return {
          id: row.id,
          kind: payload.kind,
          placeId: row.placeId,
          placeName: row.place?.name ?? payloadName(payload) ?? DELETED_PLACE_NAME,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          reviewedAt: row.reviewedAt?.toISOString() ?? null,
        }
      }),
    }
  }
}
