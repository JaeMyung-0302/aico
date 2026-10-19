import {
  validateVaccinationForm,
  type VaccinationFormState,
  vaccinationFormStateFrom,
} from '../util-vaccination/validate-vaccination-form'

const TODAY = '2026-10-15'
const BASE: VaccinationFormState = {
  type: 'DHPPL',
  customName: '',
  administeredOn: TODAY,
  nextDueOn: '2027-10-15',
  clinicName: '',
  certificates: [],
  hasCertificateConsent: false,
}

describe('validateVaccinationForm 날짜', () => {
  it('접종일은 오늘 이후일 수 없다', () => {
    const result = validateVaccinationForm({ ...BASE, administeredOn: '2026-10-16', nextDueOn: '' }, TODAY)
    expect(result.errors.administeredOn).toBe('접종일은 오늘 이후일 수 없어요')
    expect(result.submit).toBeNull()
  })

  it('다음 접종일이 접종일보다 빠르면 막는다(서버와 같은 shared 규칙)', () => {
    const result = validateVaccinationForm({ ...BASE, nextDueOn: '2026-10-01' }, TODAY)
    expect(result.errors.nextDueOn).toBe('다음 접종일은 접종일 이후여야 해요')
  })

  it('오늘 접종 + 미래 다음 접종일은 된다', () => {
    expect(validateVaccinationForm(BASE, TODAY).submit).not.toBeNull()
  })
})

describe('vaccinationFormStateFrom', () => {
  it('저장된 기록을 폼 값으로 바꾼다', () => {
    const vaccination = {
      id: '01890a5d-ac96-774b-bcce-b302099a8061',
      petId: '01890a5d-ac96-774b-bcce-b302099a8058',
      type: 'ETC' as const,
      customName: '파보',
      administeredOn: '2026-03-02',
      clinicName: null,
      nextDueOn: null,
      certificateCount: 1,
    }
    expect(vaccinationFormStateFrom(vaccination)).toEqual({
      type: 'ETC',
      customName: '파보',
      administeredOn: '2026-03-02',
      nextDueOn: '',
      clinicName: '',
      certificates: [],
      hasCertificateConsent: false,
    })
  })
})
