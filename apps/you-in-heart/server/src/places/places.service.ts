import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  CreatePlaceRequest,
  CursorQuery,
  DiaryListResponse,
  Place,
  PlaceBboxQuery,
  PlaceListResponse,
  PlaceReverseQuery,
  PlaceReverseResponse,
  PlaceSearchResponse,
  UpdatePlaceRequest,
} from '@you-in-heart/shared'
import { DiaryService } from '../diary/diary.service'
import { EventsService } from '../events/events.service'
import type { Prisma } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'
import { KakaoLocalClient } from './kakao-local.client'

const PLACE_SELECT = {
  id: true,
  name: true,
  lat: true,
  lng: true,
  kakaoPlaceId: true,
  address: true,
  createdAt: true,
} satisfies Prisma.PlaceSelect

type PlaceRow = Prisma.PlaceGetPayload<{ select: typeof PLACE_SELECT }>

const toPlace = (row: PlaceRow): Place => ({ ...row, createdAt: row.createdAt.toISOString() })

const notFound = () => new NotFoundException('장소를 찾을 수 없어요')

// 지도 핀(US-005). 모든 함수의 첫 인자는 CoupleGuard의 coupleId, 조회는 findFirst({ id, coupleId })만.
// 핀은 두 멤버 모두 고치고 지운다(일기와 달리 작성자 제한 없음)
@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly diary: DiaryService,
    private readonly kakao: KakaoLocalClient,
  ) {}

  // 커플당 핀은 수백 개 → (coupleId, lat, lng) 범위 조회로 충분(PostGIS 불필요, architecture §10)
  async list(coupleId: string, { bbox }: PlaceBboxQuery): Promise<PlaceListResponse> {
    const rows = await this.prisma.place.findMany({
      where: {
        coupleId,
        ...(bbox
          ? { lat: { gte: bbox.minLat, lte: bbox.maxLat }, lng: { gte: bbox.minLng, lte: bbox.maxLng } }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: PLACE_SELECT,
    })
    return { items: rows.map(toPlace) }
  }

  async get(coupleId: string, id: string): Promise<Place> {
    const row = await this.prisma.place.findFirst({ where: { id, coupleId }, select: PLACE_SELECT })
    if (!row) throw notFound()
    return toPlace(row)
  }

  async create(coupleId: string, actorId: string, body: CreatePlaceRequest): Promise<Place> {
    const row = await this.prisma.place.create({
      data: {
        coupleId,
        createdById: actorId,
        name: body.name,
        lat: body.lat,
        lng: body.lng,
        kakaoPlaceId: body.kakaoPlaceId ?? null,
        address: body.address ?? null,
      },
      select: PLACE_SELECT,
    })
    await this.events.record(coupleId, actorId, 'memory_created', { type: 'place' })
    return toPlace(row)
  }

  // 빈 본문이면 바꾸지 않고 현재 값을 돌려준다(빈 data의 updateMany는 0건으로 센다)
  async update(coupleId: string, id: string, body: UpdatePlaceRequest): Promise<Place> {
    if (Object.keys(body).length === 0) return this.get(coupleId, id)
    const { count } = await this.prisma.place.updateMany({ where: { id, coupleId }, data: body })
    if (count === 0) throw notFound()
    return this.get(coupleId, id)
  }

  // 일기 FK가 NO ACTION이라 연결된 일기의 placeId를 먼저 비운다. 핀 행을 먼저 잠가 그 사이 새 연결(FK 검사)이 기다리게 한다
  async remove(coupleId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Place" WHERE id = ${id}::uuid AND "coupleId" = ${coupleId}::uuid FOR UPDATE`
      if (locked.length === 0) throw notFound()
      await tx.diaryEntry.updateMany({ where: { coupleId, placeId: id }, data: { placeId: null } })
      await tx.place.deleteMany({ where: { id, coupleId } })
    })
  }

  async entries(coupleId: string, id: string, query: CursorQuery): Promise<DiaryListResponse> {
    await this.get(coupleId, id)
    return this.diary.list(coupleId, query, { placeId: id })
  }

  async search(q: string): Promise<PlaceSearchResponse> {
    return { items: await this.kakao.search(q) }
  }

  async reverse({ lat, lng }: PlaceReverseQuery): Promise<PlaceReverseResponse> {
    return { address: await this.kakao.reverse(lat, lng) }
  }
}
