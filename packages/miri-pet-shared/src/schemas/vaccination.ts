import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

export const vaccineTypeSchema = z.enum(['DHPPL', 'RABIES', 'CORONA', 'KENNEL_COUGH', 'INFLUENZA', 'HEARTWORM', 'ETC'])
export type VaccineType = z.infer<typeof vaccineTypeSchema>

export const vaccinationSchema = z.object({
  id: idSchema,
  petId: idSchema,
  type: vaccineTypeSchema,
  customName: z.string().nullable(),
  administeredOn: isoDateSchema,
  clinicName: z.string().nullable(),
  nextDueOn: isoDateSchema.nullable(),
  certificateCount: z.number().int(),
})
export type Vaccination = z.infer<typeof vaccinationSchema>

export const CUSTOM_NAME_REQUIRED_MESSAGE = '직접 입력한 접종 이름이 필요해요'
export const NEXT_DUE_BEFORE_ADMINISTERED_MESSAGE = '다음 접종일은 접종일 이후여야 해요'

// ISO 날짜(YYYY-MM-DD)는 문자열 비교가 곧 날짜 비교다
export const isNextDueOnValid = (administeredOn: string, nextDueOn: string | null | undefined): boolean =>
  !nextDueOn || nextDueOn >= administeredOn

const vaccinationFieldsSchema = z.object({
  type: vaccineTypeSchema,
  customName: z.string().trim().max(40).nullable().optional(),
  administeredOn: isoDateSchema,
  clinicName: z.string().trim().max(60).nullable().optional(),
  nextDueOn: isoDateSchema.nullable().optional(),
})

export const createVaccinationRequestSchema = vaccinationFieldsSchema
  .extend({ certificateMediaIds: z.array(idSchema).max(5).default([]) })
  .refine((v) => v.type !== 'ETC' || Boolean(v.customName), {
    path: ['customName'],
    message: CUSTOM_NAME_REQUIRED_MESSAGE,
  })
  .refine((v) => isNextDueOnValid(v.administeredOn, v.nextDueOn), {
    path: ['nextDueOn'],
    message: NEXT_DUE_BEFORE_ADMINISTERED_MESSAGE,
  })
export type CreateVaccinationRequest = z.infer<typeof createVaccinationRequestSchema>

// 부분 수정 — 기존 값과 합친 뒤의 교차 검증(ETC 이름, 다음 접종일 ≥ 접종일)은 서버가 한다
export const updateVaccinationRequestSchema = vaccinationFieldsSchema.partial()
export type UpdateVaccinationRequest = z.infer<typeof updateVaccinationRequestSchema>

export const certificateUrlSchema = z.object({
  mediaId: idSchema,
  url: z.string(),
  expiresAt: z.string(),
})
export type CertificateUrl = z.infer<typeof certificateUrlSchema>

// 홈 D-day 배너: 내 펫 전체에서 KST 오늘 이후 가장 가까운 다음 접종 1건 (없으면 item null)
export const upcomingVaccinationSchema = z.object({
  vaccination: vaccinationSchema,
  pet: z.object({ id: idSchema, name: z.string() }),
  dDay: z.number().int().nonnegative(),
})
export type UpcomingVaccination = z.infer<typeof upcomingVaccinationSchema>

export const upcomingVaccinationResponseSchema = z.object({ item: upcomingVaccinationSchema.nullable() })
export type UpcomingVaccinationResponse = z.infer<typeof upcomingVaccinationResponseSchema>

// 증명서 사진 보관 별도 동의 (D3 CERTIFICATE). 없으면 증명서 업로드 presign이 403 CERTIFICATE_CONSENT_REQUIRED
export const CERTIFICATE_CONSENT_REQUIRED_CODE = 'CERTIFICATE_CONSENT_REQUIRED'
// 현재 증명서 보관 동의 문구 버전. 다른 버전으로 동의하면 400 (문구가 바뀌면 이 값을 올리고 앱도 같이 배포)
export const CERTIFICATE_CONSENT_VERSION = '2026-10-01'
export const certificateConsentRequestSchema = z.object({ version: z.literal(CERTIFICATE_CONSENT_VERSION) })
export type CertificateConsentRequest = z.infer<typeof certificateConsentRequestSchema>

// DELETE /vaccinations/certificate-consent: 동의 철회 + 내 증명서 사진(DB·저장소) 전부 삭제. 접종 기록 자체는 남는다
export const withdrawCertificateConsentResponseSchema = z.object({
  withdrawnAt: z.string(),
  deletedCertificateCount: z.number().int().nonnegative(),
})
export type WithdrawCertificateConsentResponse = z.infer<typeof withdrawCertificateConsentResponseSchema>
