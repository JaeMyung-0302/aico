import { z } from 'zod'

export const consentKindSchema = z.enum(['TERMS', 'PRIVACY', 'LOCATION', 'CERTIFICATE', 'MARKETING'])
export type ConsentKind = z.infer<typeof consentKindSchema>

// 가입 필수 동의. CERTIFICATE(증명서 처리)는 별도 선택 동의
export const REQUIRED_CONSENT_KINDS = ['TERMS', 'PRIVACY'] as const satisfies readonly ConsentKind[]

export const submitConsentsRequestSchema = z.object({
  isAge14OrOlder: z.literal(true),
  consents: z.array(z.object({ kind: consentKindSchema, version: z.string().min(1) })).min(1),
})
export type SubmitConsentsRequest = z.infer<typeof submitConsentsRequestSchema>

// 설정 > 동의 내역 관리에서 켜고 끌 수 있는 선택 동의. CERTIFICATE는 /vaccinations/certificate-consent 전용
export const OPTIONAL_CONSENT_KINDS = ['LOCATION', 'MARKETING'] as const satisfies readonly ConsentKind[]
export type OptionalConsentKind = (typeof OPTIONAL_CONSENT_KINDS)[number]
// 설정에서 다시 동의할 때 서버가 기록하는 현재 약관 버전
export const CURRENT_CONSENT_VERSION = '2026-10-01'
// 필수 동의(TERMS·PRIVACY)는 철회 = 회원 탈퇴 → PATCH /me/consents/:kind 400
export const CONSENT_REQUIRED_KIND_CODE = 'CONSENT_REQUIRED_KIND'

// GET /me/consents: kind별 가장 최근 동의 행 (한 번도 동의하지 않은 kind는 빠진다)
export const myConsentSchema = z.object({
  kind: consentKindSchema,
  version: z.string(),
  agreedAt: z.string(),
  withdrawnAt: z.string().nullable(),
})
export type MyConsent = z.infer<typeof myConsentSchema>

export const updateConsentRequestSchema = z.object({ agreed: z.boolean() })
export type UpdateConsentRequest = z.infer<typeof updateConsentRequestSchema>
