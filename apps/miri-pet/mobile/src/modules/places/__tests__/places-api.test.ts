import { appConfigSchema, myPlaceReportListSchema, placeListSchema, placeSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import {
  createPlaceReport,
  fetchAppConfig,
  fetchMyPlaceReports,
  fetchPlace,
  fetchPlaces,
} from '../data-access-places/places-api'
import { SEONGSU_BBOX } from '../__fixtures__/places'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => ({ items: [] })) }))

const PLACE_ID = '01890a5d-ac96-774b-bcce-b302099a8001'

describe('places-api', () => {
  beforeEach(() => jest.clearAllMocks())

  it('GET /places: bbox + 필터를 쿼리 파라미터로, placeListSchema로 검증', async () => {
    await fetchPlaces({
      bbox: SEONGSU_BBOX,
      filters: { category: 'CAFE', size: 'L', isIndoorOnly: true },
      sort: 'distance',
    })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: '/places',
      params: { ...SEONGSU_BBOX, category: 'CAFE', size: 'L', indoor: 'true', sort: 'distance' },
      schema: placeListSchema,
    })
  })

  it('GET /places/:id', async () => {
    await fetchPlace(PLACE_ID)
    expect(requestApi).toHaveBeenCalledWith({ method: 'GET', url: `/places/${PLACE_ID}`, schema: placeSchema })
  })

  it('POST /places/reports', async () => {
    await createPlaceReport({ kind: 'CLOSED', placeId: PLACE_ID })
    expect(requestApi).toHaveBeenCalledWith({
      method: 'POST',
      url: '/places/reports',
      data: { kind: 'CLOSED', placeId: PLACE_ID },
    })
  })

  it('GET /me/place-reports, GET /config', async () => {
    await fetchMyPlaceReports()
    await fetchAppConfig()
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: '/me/place-reports',
      schema: myPlaceReportListSchema,
    })
    expect(requestApi).toHaveBeenCalledWith({ method: 'GET', url: '/config', schema: appConfigSchema })
  })
})
