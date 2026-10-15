import {
  type CreatePetRequest,
  type Pet,
  petSchema,
  type PublicPetList,
  publicPetListSchema,
  type UpdatePetRequest,
} from '@miri-pet/shared'
import { z } from 'zod'
import { requestApi } from '@/shared/api/api-client'

const petListSchema = z.array(petSchema)

export const fetchMyPets = (): Promise<Pet[]> => requestApi({ method: 'GET', url: '/pets', schema: petListSchema })

export const createPet = (body: CreatePetRequest): Promise<Pet> =>
  requestApi({ method: 'POST', url: '/pets', data: body, schema: petSchema })

export const updatePet = (petId: string, body: UpdatePetRequest): Promise<Pet> =>
  requestApi({ method: 'PATCH', url: `/pets/${petId}`, data: body, schema: petSchema })

export const deletePet = (petId: string): Promise<void> => requestApi({ method: 'DELETE', url: `/pets/${petId}` })

// 다른 사용자 프로필의 반려동물 탭(공개 요약: 생년만, 접종·증명서 없음)
export const fetchUserPets = (userId: string): Promise<PublicPetList> =>
  requestApi({ method: 'GET', url: `/users/${userId}/pets`, schema: publicPetListSchema })
