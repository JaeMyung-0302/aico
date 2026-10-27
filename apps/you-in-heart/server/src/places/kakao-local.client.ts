import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type PlaceSearchResult, placeSearchResultSchema } from '@you-in-heart/shared'
import { z } from 'zod'

export const KAKAO_LOCAL_BASE_URL = 'https://dapi.kakao.com/v2/local'
const TIMEOUT_MS = 5_000

// 카카오 로컬 응답 중 쓰는 필드만. 좌표는 문자열(x = 경도, y = 위도)
const keywordResponseSchema = z.object({
  documents: z.array(
    z.object({
      id: z.string(),
      place_name: z.string(),
      address_name: z.string().optional(),
      road_address_name: z.string().optional(),
      x: z.string(),
      y: z.string(),
    }),
  ),
})

const addressNameSchema = z.object({ address_name: z.string() }).nullable().optional()
const coordResponseSchema = z.object({
  documents: z.array(z.object({ road_address: addressNameSchema, address: addressNameSchema })),
})

type KeywordDocument = z.infer<typeof keywordResponseSchema>['documents'][number]

const unavailable = () =>
  new ServiceUnavailableException({ code: 'PLACE_SEARCH_UNAVAILABLE', message: '지금은 장소 검색을 쓸 수 없어요' })
const failed = () =>
  new BadGatewayException({
    code: 'PLACE_SEARCH_FAILED',
    message: '장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요',
  })

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'UnknownError')

// 잘못된 좌표(빈 문자열·범위 밖)는 버린다. 주소는 도로명 우선
const toSearchResult = (doc: KeywordDocument): PlaceSearchResult[] => {
  const parsed = placeSearchResultSchema.safeParse({
    kakaoPlaceId: doc.id,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name || null,
    lat: doc.y.trim() === '' ? Number.NaN : Number(doc.y),
    lng: doc.x.trim() === '' ? Number.NaN : Number(doc.x),
  })
  return parsed.success ? [parsed.data] : []
}

// 카카오 로컬 REST API 서버 프록시(architecture §10). REST 키는 앱에 두지 않는다.
// 검색어·좌표는 제3자 전송만 하고 로그·에러 메시지에는 남기지 않는다(경로 이름과 상태 코드만)
@Injectable()
export class KakaoLocalClient {
  private readonly logger = new Logger(KakaoLocalClient.name)

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<PlaceSearchResult[]> {
    const body = await this.get('/search/keyword.json', { query }, keywordResponseSchema)
    return body.documents.flatMap(toSearchResult)
  }

  async reverse(lat: number, lng: number): Promise<string | null> {
    const body = await this.get('/geo/coord2address.json', { x: String(lng), y: String(lat) }, coordResponseSchema)
    const [first] = body.documents
    return first?.road_address?.address_name || first?.address?.address_name || null
  }

  private async get<T>(path: string, params: Record<string, string>, schema: z.ZodType<T>): Promise<T> {
    const restApiKey = this.config.get<string>('kakao.restApiKey') ?? ''
    if (!restApiKey) {
      this.logger.warn(`[places] kakao local ${path} skipped (KAKAO_REST_API_KEY 없음)`)
      throw unavailable()
    }
    const response = await fetch(`${KAKAO_LOCAL_BASE_URL}${path}?${new URLSearchParams(params).toString()}`, {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((error: unknown) => {
      this.logger.warn(`[places] kakao local ${path} failed (${errorName(error)})`)
      throw failed()
    })
    if (!response.ok) {
      this.logger.warn(`[places] kakao local ${path} failed (HTTP ${response.status})`)
      throw failed()
    }
    const parsed = schema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) {
      this.logger.warn(`[places] kakao local ${path} failed (unexpected body)`)
      throw failed()
    }
    return parsed.data
  }
}
