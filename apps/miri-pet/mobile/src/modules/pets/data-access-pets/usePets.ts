import type { Pet } from '@miri-pet/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import type { PetFormSubmit } from '../util-pet/validate-pet-form'
import { createPet, fetchMyPets, fetchUserPets } from './pets-api'

export const PETS_QUERY_KEY = ['pets'] as const

// isEnabled: 인증 게이트는 동의를 마친 뒤에만 조회한다(동의 전 403 CONSENT_REQUIRED 방지)
export const useMyPets = ({ isEnabled = true }: { isEnabled?: boolean } = {}) =>
  useQuery({ queryKey: PETS_QUERY_KEY, queryFn: fetchMyPets, enabled: isEnabled })

// 17 프로필 반려동물 탭: 탭을 처음 열 때(userId 지정) 조회한다
export const useUserPets = (userId: string | undefined) =>
  useQuery({
    queryKey: ['users', userId, 'pets'],
    queryFn: () => fetchUserPets(userId ?? ''),
    enabled: Boolean(userId),
  })

export type SavedPet = { pet: Pet; isPhotoSaved: boolean }

const uploadAvatarOrNull = async (photo: NonNullable<PetFormSubmit['photo']>): Promise<string | null> => {
  try {
    return await uploadImage(photo, 'AVATAR')
  } catch {
    return null
  }
}

// 사진(선택) → AVATAR 업로드 → 펫 생성. 사진이 실패해도 펫은 사진 없이 저장한다(화면이 따로 알린다)
const savePet = async ({ request, photo }: PetFormSubmit): Promise<SavedPet> => {
  if (!photo) return { pet: await createPet(request), isPhotoSaved: true }
  const avatarMediaId = await uploadAvatarOrNull(photo)
  if (!avatarMediaId) return { pet: await createPet(request), isPhotoSaved: false }
  return { pet: await createPet({ ...request, avatarMediaId }), isPhotoSaved: true }
}

export const useSavePet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: savePet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_QUERY_KEY }),
  })
}
