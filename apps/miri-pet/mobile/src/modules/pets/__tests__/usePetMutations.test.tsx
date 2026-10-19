import { act, renderHook } from '@testing-library/react-native'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { deletePet, updatePet } from '../data-access-pets/pets-api'
import { PETS_QUERY_KEY, useDeletePet, useUpdatePet } from '../data-access-pets/usePets'

jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))
jest.mock('../data-access-pets/pets-api', () => ({ updatePet: jest.fn(), deletePet: jest.fn() }))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const REQUEST = { name: '보리', species: 'DOG' as const, size: 'S' as const, breed: null, birthDate: '2021-05-02' }
const PET = { id: PET_ID, ...REQUEST, avatarUrl: null }
const PHOTO = { uri: 'file:///bori.jpg', width: 10, height: 10 }

const setup = async <T,>(useHook: () => T) => {
  const client = createTestQueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const { result } = await renderHook(useHook, {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { result, invalidate }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(updatePet).mockResolvedValue(PET)
  jest.mocked(deletePet).mockResolvedValue(undefined)
  jest.mocked(uploadImage).mockResolvedValue('avatar-media')
})

describe('useUpdatePet', () => {
  it('새 사진이 있으면 AVATAR로 올려 avatarMediaId와 함께 수정하고 펫 목록을 새로 고친다', async () => {
    const { result, invalidate } = await setup(() => useUpdatePet(PET_ID))
    await act(async () => {
      await result.current.mutateAsync({ request: REQUEST, photo: PHOTO })
    })
    expect(uploadImage).toHaveBeenCalledWith(PHOTO, 'AVATAR')
    expect(updatePet).toHaveBeenCalledWith(PET_ID, { ...REQUEST, avatarMediaId: 'avatar-media' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PETS_QUERY_KEY })
  })

  it('사진을 바꾸지 않으면 avatarMediaId를 보내지 않는다(기존 사진 유지)', async () => {
    const { result } = await setup(() => useUpdatePet(PET_ID))
    let saved: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
    await act(async () => {
      saved = await result.current.mutateAsync({ request: REQUEST, photo: null })
    })
    expect(uploadImage).not.toHaveBeenCalled()
    expect(updatePet).toHaveBeenCalledWith(PET_ID, REQUEST)
    expect(saved).toEqual({ pet: PET, isPhotoSaved: true })
  })

  it('사진 업로드가 실패해도 나머지는 고치고 isPhotoSaved=false', async () => {
    jest.mocked(uploadImage).mockRejectedValue(new Error('storage down'))
    const { result } = await setup(() => useUpdatePet(PET_ID))
    let saved: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
    await act(async () => {
      saved = await result.current.mutateAsync({ request: REQUEST, photo: PHOTO })
    })
    expect(updatePet).toHaveBeenCalledWith(PET_ID, REQUEST)
    expect(saved).toEqual({ pet: PET, isPhotoSaved: false })
  })
})

describe('useDeletePet', () => {
  it('지우고 펫 목록·접종 기록(펫별 + 다가오는 접종)을 새로 고친다', async () => {
    const { result, invalidate } = await setup(() => useDeletePet())
    await act(async () => {
      await result.current.mutateAsync(PET_ID)
    })
    expect(deletePet).toHaveBeenCalledWith(PET_ID)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PETS_QUERY_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vaccinations'] })
  })
})
