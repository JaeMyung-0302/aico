import type { Pet, PetSize } from '@miri-pet/shared'

export const SIZE_LABELS: Record<PetSize, string> = { S: '소형', M: '중형', L: '대형' }

// 만 나이 (YYYY-MM-DD 문자열 비교)
export const ageInYears = (birthDate: string, today: string): number => {
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4))
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years
}

const ageLabel = (birthDate: string, today: string): string => {
  const age = ageInYears(birthDate, today)
  return age < 1 ? '1살 미만' : `${age}살`
}

// 디자인 14: "말티즈 · 5살 · 소형"
export const petInfoLine = (pet: Pick<Pet, 'breed' | 'birthDate' | 'size'>, today: string): string =>
  [pet.breed, pet.birthDate ? ageLabel(pet.birthDate, today) : null, SIZE_LABELS[pet.size]]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
