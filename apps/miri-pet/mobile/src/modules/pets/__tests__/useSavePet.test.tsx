import { act, renderHook } from '@testing-library/react-native'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { createPet } from '../data-access-pets/pets-api'
import { PETS_QUERY_KEY, useSavePet } from '../data-access-pets/usePets'

jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))
jest.mock('../data-access-pets/pets-api', () => ({ createPet: jest.fn() }))

const REQUEST = { name: '보리', species: 'DOG' as const, size: 'S' as const, breed: null, birthDate: null }
const PET = { id: '01890a5d-ac96-774b-bcce-b302099a8058', ...REQUEST, avatarUrl: null }
const PHOTO = { uri: 'file:///bori.jpg', width: 10, height: 10 }

const setup = async () => {
  const client = createTestQueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  const { result } = await renderHook(() => useSavePet(), {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { result, invalidate }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(createPet).mockResolvedValue(PET)
  jest.mocked(uploadImage).mockResolvedValue('avatar-media')
})

describe('useSavePet', () => {
  it('사진이 있으면 AVATAR로 올린 뒤 avatarMediaId와 함께 만들고 펫 목록을 새로 고친다', async () => {
    const { result, invalidate } = await setup()
    await act(async () => {
      await result.current.mutateAsync({ request: REQUEST, photo: PHOTO })
    })
    expect(uploadImage).toHaveBeenCalledWith(PHOTO, 'AVATAR')
    expect(createPet).toHaveBeenCalledWith({ ...REQUEST, avatarMediaId: 'avatar-media' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PETS_QUERY_KEY })
  })

  it('사진이 없으면 업로드 없이 만든다', async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.mutateAsync({ request: REQUEST, photo: null })
    })
    expect(uploadImage).not.toHaveBeenCalled()
    expect(createPet).toHaveBeenCalledWith(REQUEST)
  })
})
