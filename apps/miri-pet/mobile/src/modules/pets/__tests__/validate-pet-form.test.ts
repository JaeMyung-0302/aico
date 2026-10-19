import { petFormStateFrom, validatePetForm } from '../util-pet/validate-pet-form'

const TODAY = '2026-10-15'
const BASE = { name: '보리', species: 'DOG' as const, size: 'S' as const, breed: '', birthDate: '', photo: null }

describe('validatePetForm 생일', () => {
  it('오늘 이후 생일은 막는다', () => {
    const result = validatePetForm({ ...BASE, birthDate: '2026-10-16' }, TODAY)
    expect(result.errors.birthDate).toBe('생일은 오늘 이후일 수 없어요')
    expect(result.submit).toBeNull()
  })

  it('오늘 생일은 된다', () => {
    expect(validatePetForm({ ...BASE, birthDate: TODAY }, TODAY).submit?.request.birthDate).toBe(TODAY)
  })
})

describe('petFormStateFrom', () => {
  it('저장된 펫을 폼 값으로 바꾼다(빈 값은 빈 문자열, 사진은 새로 고르기 전까지 null)', () => {
    const pet = {
      id: '01890a5d-ac96-774b-bcce-b302099a8058',
      name: '보리',
      species: 'CAT' as const,
      breed: null,
      birthDate: '2021-05-02',
      size: 'M' as const,
      avatarUrl: 'https://r2.test/a.jpg',
    }
    expect(petFormStateFrom(pet)).toEqual({
      name: '보리',
      species: 'CAT',
      size: 'M',
      breed: '',
      birthDate: '2021-05-02',
      photo: null,
    })
  })
})
