import type { CreatePetRequest, PetSize } from '@miri-pet/shared'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { isIsoDate } from '@/modules/vaccinations/util-vaccination/vaccination-dates'

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

export const validatePetForm = (state: PetFormState): { errors: PetFormErrors; submit: PetFormSubmit | null } => {
  const name = state.name.trim()
  const birthDate = state.birthDate || null
  const errors: PetFormErrors = {
    ...(name.length === 0 ? { name: '이름을 입력해 주세요' } : {}),
    ...(name.length > NAME_MAX ? { name: `이름은 ${NAME_MAX}자까지 쓸 수 있어요` } : {}),
    ...(birthDate && !isIsoDate(birthDate) ? { birthDate: '날짜를 YYYY-MM-DD로 입력해 주세요' } : {}),
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
