import { publicPetListSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { fetchUserPets } from '../data-access-pets/pets-api'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

const USER_ID = '01890a5d-ac96-774b-bcce-b302099a8057'

describe('다른 사용자 펫 API 계약', () => {
  it('GET /users/:id/pets 를 공개 요약 스키마로 검증한다', async () => {
    await fetchUserPets(USER_ID)
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: `/users/${USER_ID}/pets`,
      schema: publicPetListSchema,
    })
  })
})
