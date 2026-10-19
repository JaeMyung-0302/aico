import type { CreatePetRequest, Pet, PetSize } from '@miri-pet/shared'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { isIsoDate, kstToday } from '@/modules/vaccinations/util-vaccination/vaccination-dates'

export type PetSpecies = CreatePetRequest['species']

export type PetFormState = {
  name: string
  species: PetSpecies
  size: PetSize
  breed: string
  birthDate: string
  photo: PickedImage | null
}

export type PetFormErrors = Partial<Record<'name' | 'birthDate', string>>
export type PetDraft = { name: string; species: PetSpecies; size: PetSize; breed: string | null; birthDate: string | null }
export type PetFormSubmit = { request: PetDraft; photo: PickedImage | null }

const NAME_MAX = 20

// 수정 화면의 초기값: 사진은 새로 고를 때만 바꾼다(기존 사진은 avatarUrl로 따로 보여준다)
export const petFormStateFrom = (pet: Pet): PetFormState => ({
  name: pet.name,
  species: pet.species,
  size: pet.size,
  breed: pet.breed ?? '',
  birthDate: pet.birthDate ?? '',
  photo: null,
})

// 날짜 오류: 형식 → 미래 (ISO 날짜는 문자열 비교가 곧 날짜 비교)
const birthDateError = (birthDate: string | null, today: string): string | null => {
  if (!birthDate) return null
  if (!isIsoDate(birthDate)) return '날짜를 YYYY-MM-DD로 입력해 주세요'
  return birthDate > today ? '생일은 오늘 이후일 수 없어요' : null
}

export const validatePetForm = (
  state: PetFormState,
  today: string = kstToday(new Date()),
): { errors: PetFormErrors; submit: PetFormSubmit | null } => {
  const name = state.name.trim()
  const birthDate = state.birthDate || null
  const birthDateMessage = birthDateError(birthDate, today)
  const errors: PetFormErrors = {
    ...(name.length === 0 ? { name: '이름을 입력해 주세요' } : {}),
    ...(name.length > NAME_MAX ? { name: `이름은 ${NAME_MAX}자까지 쓸 수 있어요` } : {}),
    ...(birthDateMessage ? { birthDate: birthDateMessage } : {}),
  }
  if (Object.keys(errors).length > 0) return { errors, submit: null }
  return {
    errors,
    submit: {
      request: { name, species: state.species, size: state.size, breed: state.breed.trim() || null, birthDate },
      photo: state.photo,
    },
  }
}
