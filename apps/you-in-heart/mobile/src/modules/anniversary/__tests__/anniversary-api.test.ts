import { anniversaryListResponseSchema, customAnniversarySchema } from '@you-in-heart/shared'
import { ANNIVERSARY_ITEMS, CUSTOM_ANNIVERSARY_ID } from '@/test-utils/fixtures'
import {
  createAnniversary,
  deleteAnniversary,
  fetchAnniversaries,
  updateAnniversary,
} from '../data-access-anniversary/anniversary-api'

// requestApi 는 오버로드(스키마 유무) 타입이라 jest.mocked 가 void 쪽을 고른다 → 응답을 unknown 으로 받는 대역을 쓴다
const mockRequestApi = jest.fn<Promise<unknown>, [unknown]>()
jest.mock('@/shared/api/api-client', () => ({ requestApi: (options: unknown) => mockRequestApi(options) }))

const SAVED = { id: CUSTOM_ANNIVERSARY_ID, title: '처음 만난 날', date: '2025-08-23' }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('anniversary-api', () => {
  it('GET /anniversaries?from&to 를 shared 스키마로 검증하고 items 만 돌려준다', async () => {
    mockRequestApi.mockResolvedValueOnce({ items: ANNIVERSARY_ITEMS })
    await expect(fetchAnniversaries({ from: '2025-10-27', to: '2027-10-27' })).resolves.toEqual(ANNIVERSARY_ITEMS)
    expect(mockRequestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: '/anniversaries',
      params: { from: '2025-10-27', to: '2027-10-27' },
      schema: anniversaryListResponseSchema,
    })
  })

  it('커스텀 추가·수정·삭제 경로와 본문', async () => {
    mockRequestApi.mockResolvedValue(SAVED)
    await createAnniversary({ title: '처음 만난 날', date: '2025-08-23' })
    expect(mockRequestApi).toHaveBeenLastCalledWith({
      method: 'POST',
      url: '/anniversaries',
      data: { title: '처음 만난 날', date: '2025-08-23' },
      schema: customAnniversarySchema,
    })

    await updateAnniversary(CUSTOM_ANNIVERSARY_ID, { title: '첫 만남' })
    expect(mockRequestApi).toHaveBeenLastCalledWith({
      method: 'PATCH',
      url: `/anniversaries/${CUSTOM_ANNIVERSARY_ID}`,
      data: { title: '첫 만남' },
      schema: customAnniversarySchema,
    })

    mockRequestApi.mockResolvedValue(undefined)
    await deleteAnniversary(CUSTOM_ANNIVERSARY_ID)
    expect(mockRequestApi).toHaveBeenLastCalledWith({
      method: 'DELETE',
      url: `/anniversaries/${CUSTOM_ANNIVERSARY_ID}`,
    })
  })

  it('id 는 URL 인코딩한다 (자동 기념일 id 의 ":" 등)', async () => {
    mockRequestApi.mockResolvedValue(undefined)
    await deleteAnniversary('auto:100d:500')
    expect(mockRequestApi).toHaveBeenLastCalledWith({ method: 'DELETE', url: '/anniversaries/auto%3A100d%3A500' })
  })
})
