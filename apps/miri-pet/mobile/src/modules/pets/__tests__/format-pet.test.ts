import { ageInYears, petInfoLine, SIZE_LABELS } from '../util-pet/format-pet'

const PET = {
  id: '01890a5d-ac96-774b-bcce-b302099a8058',
  name: '보리',
  species: 'DOG' as const,
  breed: '말티즈',
  birthDate: '2021-05-02',
  size: 'S' as const,
  avatarUrl: null,
}

describe('format-pet', () => {
  it('만 나이: 생일 전이면 한 살 적다', () => {
    expect(ageInYears('2021-05-02', '2026-05-01')).toBe(4)
    expect(ageInYears('2021-05-02', '2026-05-02')).toBe(5)
  })

  it('정보 줄: 품종 · 나이 · 크기 (없는 값은 뺀다)', () => {
    expect(petInfoLine(PET, '2026-10-15')).toBe('말티즈 · 5살 · 소형')
    expect(petInfoLine({ ...PET, breed: null, birthDate: null, size: 'L' }, '2026-10-15')).toBe('대형')
  })

  it('1살 미만은 개월 수 대신 "1살 미만"', () => {
    expect(petInfoLine({ ...PET, birthDate: '2026-03-01' }, '2026-10-15')).toBe('말티즈 · 1살 미만 · 소형')
  })

  it('크기 라벨', () => {
    expect(SIZE_LABELS).toEqual({ S: '소형', M: '중형', L: '대형' })
  })
})
