import { act, renderHook } from '@testing-library/react-native'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { deleteVaccination, updateVaccination } from '../data-access-vaccinations/vaccinations-api'
import {
  UPCOMING_VACCINATION_QUERY_KEY,
  useDeleteVaccination,
  useUpdateVaccination,
  vaccinationsQueryKey,
} from '../data-access-vaccinations/useVaccinations'

jest.mock('../data-access-vaccinations/vaccinations-api', () => ({
  updateVaccination: jest.fn(),
  deleteVaccination: jest.fn(),
}))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const VACCINATION_ID = '01890a5d-ac96-774b-bcce-b302099a8061'
const REQUEST = {
  type: 'DHPPL' as const,
  customName: null,
  administeredOn: '2026-10-01',
  nextDueOn: '2027-10-01',
  clinicName: null,
}

const setup = async <T,>(useHook: () => T) => {
  const client = createTestQueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const { result } = await renderHook(useHook, {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { result, invalidate }
}

const expectRefreshed = (invalidate: jest.SpyInstance) => {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: vaccinationsQueryKey(PET_ID) })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: UPCOMING_VACCINATION_QUERY_KEY })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(updateVaccination)
    .mockResolvedValue({ id: VACCINATION_ID, petId: PET_ID, ...REQUEST, certificateCount: 0 })
  jest.mocked(deleteVaccination).mockResolvedValue(undefined)
})

describe('useUpdateVaccination', () => {
  it('폼 값 전체(다음 접종일 포함)로 수정하고 기록·D-day를 새로 고친다', async () => {
    const { result, invalidate } = await setup(() => useUpdateVaccination(PET_ID, VACCINATION_ID))
    await act(async () => {
      await result.current.mutateAsync(REQUEST)
    })
    expect(updateVaccination).toHaveBeenCalledWith(VACCINATION_ID, REQUEST)
    expectRefreshed(invalidate)
  })
})

describe('useDeleteVaccination', () => {
  it('지우고 기록·D-day를 새로 고친다', async () => {
    const { result, invalidate } = await setup(() => useDeleteVaccination(PET_ID))
    await act(async () => {
      await result.current.mutateAsync(VACCINATION_ID)
    })
    expect(deleteVaccination).toHaveBeenCalledWith(VACCINATION_ID)
    expectRefreshed(invalidate)
  })
})
