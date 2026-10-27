import { BadGatewayException, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { KAKAO_LOCAL_BASE_URL, KakaoLocalClient } from './kakao-local.client'

const QUERY = '성수동 카페 비밀장소'
const LAT = 37.544_321
const LNG = 127.055_987

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const KEYWORD_RESPONSE = {
  documents: [
    {
      id: '26338954',
      place_name: '성수 카페',
      address_name: '서울 성동구 성수동2가 1',
      road_address_name: '서울 성동구 연무장길 1',
      x: '127.055987',
      y: '37.544321',
    },
    {
      id: '1',
      place_name: '지번만',
      address_name: '서울 성동구 성수동1가 2',
      road_address_name: '',
      x: '127.1',
      y: '37.5',
    },
    // 좌표가 숫자가 아니면 버린다
    { id: '2', place_name: '좌표 없음', address_name: '', road_address_name: '', x: '', y: 'abc' },
  ],
  meta: { total_count: 3 },
}

const COORD_RESPONSE = {
  documents: [
    {
      road_address: { address_name: '서울 성동구 연무장길 1' },
      address: { address_name: '서울 성동구 성수동2가 1' },
    },
  ],
}

describe('KakaoLocalClient', () => {
  const fetchMock = jest.fn()
  const client = (restApiKey = 'rest-key') => new KakaoLocalClient(new ConfigService({ kakao: { restApiKey } }))
  // 모든 레벨의 로그 인자를 모아 검색어·좌표가 0회인지 본다
  const loggedText = (): string =>
    (['log', 'warn', 'error', 'debug', 'verbose'] as const)
      .flatMap((level) => jest.mocked(Logger.prototype[level]).mock.calls)
      .map((call) => call.map(String).join(' '))
      .join('\n')
  const expectNoSensitiveLogs = () => {
    const text = loggedText()
    expect(text).not.toContain(QUERY)
    expect(text).not.toContain(encodeURIComponent(QUERY))
    expect(text).not.toMatch(/37\.54|127\.05/)
  }

  beforeEach(() => {
    fetchMock.mockReset()
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock)
    ;(['log', 'warn', 'error', 'debug', 'verbose'] as const).forEach((level) =>
      jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('search', () => {
    it('키워드 검색을 REST 키로 호출하고 응답을 PlaceSearchResult로 바꾼다(도로명 우선, 잘못된 좌표 제외)', async () => {
      fetchMock.mockResolvedValue(json(KEYWORD_RESPONSE))

      const items = await client().search(QUERY)

      const [url, init] = fetchMock.mock.calls[0]
      const parsed = new URL(String(url))
      expect(`${parsed.origin}${parsed.pathname}`).toBe(`${KAKAO_LOCAL_BASE_URL}/search/keyword.json`)
      expect(parsed.searchParams.get('query')).toBe(QUERY)
      expect(init.headers.Authorization).toBe('KakaoAK rest-key')
      expect(init.signal).toBeInstanceOf(AbortSignal)
      expect(items).toEqual([
        { kakaoPlaceId: '26338954', name: '성수 카페', address: '서울 성동구 연무장길 1', lat: LAT, lng: LNG },
        { kakaoPlaceId: '1', name: '지번만', address: '서울 성동구 성수동1가 2', lat: 37.5, lng: 127.1 },
      ])
      expectNoSensitiveLogs()
    })

    it('카카오가 실패 응답을 주면 502 PLACE_SEARCH_FAILED, 로그에는 상태 코드만', async () => {
      fetchMock.mockResolvedValue(json({ msg: 'error' }, 500))

      const error = await client()
        .search(QUERY)
        .catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(BadGatewayException)
      expect((error as BadGatewayException).getResponse()).toMatchObject({ code: 'PLACE_SEARCH_FAILED' })
      expect(loggedText()).toContain('500')
      expectNoSensitiveLogs()
    })

    it('네트워크 오류·응답 모양이 다르면 502, 로그에 검색어 없음', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed ${QUERY}`))
      await expect(client().search(QUERY)).rejects.toBeInstanceOf(BadGatewayException)
      fetchMock.mockResolvedValueOnce(json({ documents: 'nope' }))
      await expect(client().search(QUERY)).rejects.toBeInstanceOf(BadGatewayException)
      expectNoSensitiveLogs()
    })

    it('REST 키가 없으면 호출하지 않고 503 PLACE_SEARCH_UNAVAILABLE', async () => {
      const error = await client('')
        .search(QUERY)
        .catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(ServiceUnavailableException)
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({ code: 'PLACE_SEARCH_UNAVAILABLE' })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('reverse', () => {
    it('coord2address를 x=lng, y=lat로 호출하고 도로명 주소(없으면 지번)를 돌려준다', async () => {
      fetchMock.mockResolvedValue(json(COORD_RESPONSE))

      expect(await client().reverse(LAT, LNG)).toBe('서울 성동구 연무장길 1')

      const parsed = new URL(String(fetchMock.mock.calls[0][0]))
      expect(parsed.pathname).toBe('/v2/local/geo/coord2address.json')
      expect([parsed.searchParams.get('x'), parsed.searchParams.get('y')]).toEqual([String(LNG), String(LAT)])
      expectNoSensitiveLogs()
    })

    it('도로명이 없으면 지번, 결과가 없으면 null', async () => {
      fetchMock.mockResolvedValueOnce(
        json({ documents: [{ road_address: null, address: { address_name: '서울 성동구 성수동2가 1' } }] }),
      )
      expect(await client().reverse(LAT, LNG)).toBe('서울 성동구 성수동2가 1')
      fetchMock.mockResolvedValueOnce(json({ documents: [] }))
      expect(await client().reverse(LAT, LNG)).toBeNull()
    })

    it('실패하면 502, 로그에 좌표 없음', async () => {
      fetchMock.mockResolvedValue(json({}, 401))
      await expect(client().reverse(LAT, LNG)).rejects.toBeInstanceOf(BadGatewayException)
      expectNoSensitiveLogs()
    })
  })
})
