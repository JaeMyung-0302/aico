import type { VaccineType } from '@miri-pet/shared'
import { useState } from 'react'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { defaultNextDueOn, formatDateInput } from '../util-vaccination/vaccination-dates'
import type { VaccinationFormState } from '../util-vaccination/validate-vaccination-form'

const MAX_CERTIFICATES = 5

// 다음 접종일은 사용자가 직접 고치기 전까지 종류·접종일에 맞춰 자동으로 채운다
export const useVaccinationFormState = (today: string) => {
  const [state, setState] = useState<VaccinationFormState>({
    type: 'DHPPL',
    customName: '',
    administeredOn: today,
    nextDueOn: defaultNextDueOn('DHPPL', today) ?? '',
    clinicName: '',
    certificates: [],
    hasCertificateConsent: false,
  })
  const [isNextDueTouched, setIsNextDueTouched] = useState(false)

  const withAutoNextDue = (next: VaccinationFormState): VaccinationFormState =>
    isNextDueTouched ? next : { ...next, nextDueOn: defaultNextDueOn(next.type, next.administeredOn) ?? '' }

  return {
    state,
    setType: (type: VaccineType) => setState((prev) => withAutoNextDue({ ...prev, type })),
    setAdministeredOn: (raw: string) =>
      setState((prev) => withAutoNextDue({ ...prev, administeredOn: formatDateInput(raw) })),
    setNextDueOn: (raw: string) => {
      setIsNextDueTouched(true)
      setState((prev) => ({ ...prev, nextDueOn: formatDateInput(raw) }))
    },
    setCustomName: (customName: string) => setState((prev) => ({ ...prev, customName })),
    setClinicName: (clinicName: string) => setState((prev) => ({ ...prev, clinicName })),
    toggleCertificateConsent: () =>
      setState((prev) => ({ ...prev, hasCertificateConsent: !prev.hasCertificateConsent })),
    addCertificate: (image: PickedImage) =>
      setState((prev) => ({ ...prev, certificates: [...prev.certificates, image].slice(0, MAX_CERTIFICATES) })),
    removeCertificate: (index: number) =>
      setState((prev) => ({ ...prev, certificates: prev.certificates.filter((_, i) => i !== index) })),
    canAddCertificate: state.certificates.length < MAX_CERTIFICATES,
  }
}
