import { Injectable } from '@nestjs/common'
import type { PlaceBboxQuery } from '@miri-pet/shared'
import type { Place } from '../generated/prisma'
import { PrismaService } from '../prisma/prisma.service'

// 장소는 운영 데이터(사용자 콘텐츠 아님) → hiddenUserIds 필터 대상이 아니다
@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // (lat, lng) btree 범위 스캔 + 필터. ACTIVE만 (D4)
  findInBbox(query: PlaceBboxQuery, take: number): Promise<Place[]> {
    return this.prisma.place.findMany({
      where: {
        status: 'ACTIVE',
        lat: { gte: query.swLat, lte: query.neLat },
        lng: { gte: query.swLng, lte: query.neLng },
        ...(query.category ? { category: query.category } : {}),
        ...(query.size ? { allowedSizes: { has: query.size } } : {}),
        ...(query.indoor === undefined ? {} : { indoorAllowed: query.indoor }),
      },
      orderBy: { id: 'asc' },
      take,
    })
  }

  findActiveById(id: string): Promise<Place | null> {
    return this.prisma.place.findFirst({ where: { id, status: 'ACTIVE' } })
  }
}
