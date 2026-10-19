import { createVaccinationRequestSchema, type Vaccination, type VaccineType } from '@miri-pet/shared'
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
const FUTURE_ADMINISTERED_MESSAGE = '접종일은 오늘 이후일 수 없어요'

// 수정 화면의 초기값 (증명서는 수정 API가 받지 않아 새로 붙이지 않는다)
export const vaccinationFormStateFrom = (vaccination: Vaccination): VaccinationFormState => ({
  type: vaccination.type,
  customName: vaccination.customName ?? '',
  administeredOn: vaccination.administeredOn,
  nextDueOn: vaccination.nextDueOn ?? '',
  clinicName: vaccination.clinicName ?? '',
  certificates: [],
  hasCertificateConsent: false,
})

const administeredOnError = (administeredOn: string, today: string): string | null => {
  if (!isIsoDate(administeredOn)) return DATE_FORMAT_MESSAGE
  return administeredOn > today ? FUTURE_ADMINISTERED_MESSAGE : null
}

const toDraft = (state: VaccinationFormState): VaccinationDraft => ({
  type: state.type,
  customName: state.type === 'ETC' ? state.customName.trim() || null : null,
  administeredOn: state.administeredOn,
  nextDueOn: state.nextDueOn || null,
  clinicName: state.clinicName.trim() || null,
})

// 서버와 같은 shared 스키마로 검증하고(ETC 이름, 다음 접종일 ≥ 접종일) 화면 전용 규칙(날짜 형식·미래 접종일, 증명서 동의)을 더한다
export const validateVaccinationForm = (
  state: VaccinationFormState,
  today: string,
): { errors: VaccinationFormErrors; submit: VaccinationFormSubmit | null } => {
  const draft = toDraft(state)
  const administeredMessage = administeredOnError(draft.administeredOn, today)
  const formatErrors: VaccinationFormErrors = {
    ...(administeredMessage ? { administeredOn: administeredMessage } : {}),
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
