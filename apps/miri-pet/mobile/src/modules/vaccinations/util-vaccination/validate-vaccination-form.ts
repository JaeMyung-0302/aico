import { createVaccinationRequestSchema, type VaccineType } from '@miri-pet/shared'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { isIsoDate } from './vaccination-dates'

export type VaccinationFormState = {
  type: VaccineType
  customName: string
  administeredOn: string
  nextDueOn: string
  clinicName: string
  certificates: PickedImage[]
  hasCertificateConsent: boolean
}

export type VaccinationDraft = {
  type: VaccineType
  customName: string | null
  administeredOn: string
  nextDueOn: string | null
  clinicName: string | null
}

export type VaccinationFormErrors = Partial<
  Record<'customName' | 'administeredOn' | 'nextDueOn' | 'certificates', string>
>

export type VaccinationFormSubmit = { request: VaccinationDraft; certificates: PickedImage[] }

const DATE_FORMAT_MESSAGE = '날짜를 YYYY-MM-DD로 입력해 주세요'
const CONSENT_MESSAGE = '증명서 사진 보관에 동의해 주세요'

const toDraft = (state: VaccinationFormState): VaccinationDraft => ({
  type: state.type,
  customName: state.type === 'ETC' ? state.customName.trim() || null : null,
  administeredOn: state.administeredOn,
  nextDueOn: state.nextDueOn || null,
  clinicName: state.clinicName.trim() || null,
})

// 서버와 같은 shared 스키마로 검증하고(ETC 이름, 다음 접종일 ≥ 접종일) 화면 전용 규칙(날짜 형식, 증명서 동의)을 더한다
export const validateVaccinationForm = (
  state: VaccinationFormState,
): { errors: VaccinationFormErrors; submit: VaccinationFormSubmit | null } => {
  const draft = toDraft(state)
  const formatErrors: VaccinationFormErrors = {
    ...(isIsoDate(draft.administeredOn) ? {} : { administeredOn: DATE_FORMAT_MESSAGE }),
    ...(draft.nextDueOn && !isIsoDate(draft.nextDueOn) ? { nextDueOn: DATE_FORMAT_MESSAGE } : {}),
    ...(state.certificates.length > 0 && !state.hasCertificateConsent ? { certificates: CONSENT_MESSAGE } : {}),
  }
  const parsed = createVaccinationRequestSchema.safeParse({ ...draft, certificateMediaIds: [] })
  const schemaErrors: VaccinationFormErrors = parsed.success
    ? {}
    : Object.fromEntries(
        parsed.error.issues
          .map((issue) => [String(issue.path[0]), issue.message] as const)
          .filter(([path]) => path === 'customName' || path === 'nextDueOn'),
      )
  const errors = { ...schemaErrors, ...formatErrors }
  const isValid = Object.keys(errors).length === 0
  return { errors, submit: isValid ? { request: draft, certificates: state.certificates } : null }
}
