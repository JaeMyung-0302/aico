import { act, renderHook } from '@testing-library/react-native'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { agreeCertificateConsent, createVaccination } from '../data-access-vaccinations/vaccinations-api'
import { useSaveVaccination, vaccinationsQueryKey } from '../data-access-vaccinations/useVaccinations'

jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))
jest.mock('../data-access-vaccinations/vaccinations-api', () => ({
  agreeCertificateConsent: jest.fn(),
  createVaccination: jest.fn(),
}))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const REQUEST = {
  type: 'DHPPL' as const,
  customName: null,
  administeredOn: '2026-10-15',
  nextDueOn: '2027-10-15',
  clinicName: null,
}
const PHOTOS = [
  { uri: 'file:///a.jpg', width: 10, height: 10 },
  { uri: 'file:///b.jpg', width: 10, height: 10 },
]
const CREATED = { id: '01890a5d-ac96-774b-bcce-b302099a8060', petId: PET_ID, ...REQUEST, certificateCount: 2 }

const setup = async () => {
  const client = createTestQueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const { result } = await renderHook(() => useSaveVaccination(PET_ID), {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { result, invalidate }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(uploadImage).mockResolvedValueOnce('media-a').mockResolvedValueOnce('media-b')
  jest.mocked(createVaccination).mockResolvedValue(CREATED)
  jest.mocked(agreeCertificateConsent).mockResolvedValue(undefined)
})

describe('useSaveVaccination', () => {
  it('증명서가 있으면 보관 동의 → 사진마다 CERTIFICATE 업로드 → mediaId로 기록 생성', async () => {
    const { result, invalidate } = await setup()
    await act(async () => {
      await result.current.mutateAsync({ request: REQUEST, certificates: PHOTOS })
    })

    expect(agreeCertificateConsent).toHaveBeenCalledTimes(1)
    expect(jest.mocked(agreeCertificateConsent).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(uploadImage).mock.invocationCallOrder[0] ?? 0,
    )
    expect(uploadImage).toHaveBeenNthCalledWith(1, PHOTOS[0], 'CERTIFICATE')
    expect(uploadImage).toHaveBeenNthCalledWith(2, PHOTOS[1], 'CERTIFICATE')
    expect(createVaccination).toHaveBeenCalledWith(PET_ID, { ...REQUEST, certificateMediaIds: ['media-a', 'media-b'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: vaccinationsQueryKey(PET_ID) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vaccinations', 'upcoming'] })
  })

  it('증명서가 없으면 동의·업로드 없이 바로 만든다', async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.mutateAsync({ request: REQUEST, certificates: [] })
    })
    expect(agreeCertificateConsent).not.toHaveBeenCalled()
    expect(uploadImage).not.toHaveBeenCalled()
    expect(createVaccination).toHaveBeenCalledWith(PET_ID, { ...REQUEST, certificateMediaIds: [] })
  })

  it('업로드가 실패하면 기록을 만들지 않는다', async () => {
    jest.mocked(uploadImage).mockReset().mockRejectedValue(new Error('upload'))
    const { result } = await setup()
    await act(async () => {
      await expect(result.current.mutateAsync({ request: REQUEST, certificates: PHOTOS })).rejects.toThrow('upload')
    })
    expect(createVaccination).not.toHaveBeenCalled()
  })
})
