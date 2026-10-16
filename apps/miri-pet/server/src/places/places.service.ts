import { Injectable, NotFoundException } from '@nestjs/common'
import { PLACES_BBOX_MAX_RESULTS, type Place, type PlaceBboxQuery, type PlaceList } from '@miri-pet/shared'
import { assertValidBbox, bboxCenter, haversineKm } from './geo'
import { toPlaceDto } from './place-mapper'
import { PlacesRepository } from './places.repository'

const PLACE_NOT_FOUND = '장소를 찾을 수 없어요'

// 거리순은 bbox 결과(최대 300건)를 앱 서버에서 정렬한다. 기준점은 지도 중심(기기 좌표 아님)
const sortByDistance = (items: readonly Place[], query: PlaceBboxQuery): Place[] => {
  const center = bboxCenter(query)
  return items
    .map((place) => ({ place, distance: haversineKm(center, place) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ place }) => place)
}

@Injectable()
export class PlacesService {
  constructor(private readonly repository: PlacesRepository) {}

  async list(query: PlaceBboxQuery): Promise<PlaceList> {
    assertValidBbox(query)
    // 1건 더 읽어 상한 초과 여부를 안다
    const rows = await this.repository.findInBbox(query, PLACES_BBOX_MAX_RESULTS + 1)
    const items = rows.slice(0, PLACES_BBOX_MAX_RESULTS).map(toPlaceDto)
    return {
      items: query.sort === 'distance' ? sortByDistance(items, query) : items,
      isTruncated: rows.length > PLACES_BBOX_MAX_RESULTS,
    }
  }

  async get(id: string): Promise<Place> {
    const place = await this.repository.findActiveById(id)
    if (!place) throw new NotFoundException(PLACE_NOT_FOUND)
    return toPlaceDto(place)
  }

  async assertActive(id: string): Promise<void> {
    if (!(await this.repository.findActiveById(id))) throw new NotFoundException(PLACE_NOT_FOUND)
  }
}
