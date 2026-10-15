import {
  type ConsentKind,
  type MyConsent,
  myConsentSchema,
  type WithdrawCertificateConsentResponse,
  withdrawCertificateConsentResponseSchema,
} from '@miri-pet/shared'
import { z } from 'zod'
import { requestApi } from '@/shared/api/api-client'

const myConsentsSchema = z.array(myConsentSchema)

export const fetchMyConsents = (): Promise<MyConsent[]> =>
  requestApi({ method: 'GET', url: '/me/consents', schema: myConsentsSchema })

// 선택 동의(LOCATION·MARKETING)만 서버가 받는다. 응답은 바뀐 뒤의 전체 목록
export const updateConsent = ({ kind, isAgreed }: { kind: ConsentKind; isAgreed: boolean }): Promise<MyConsent[]> =>
  requestApi({ method: 'PATCH', url: `/me/consents/${kind}`, data: { agreed: isAgreed }, schema: myConsentsSchema })

// 증명서 보관 동의 철회는 기존 엔드포인트(보관된 증명서 사진도 함께 지운다)
export const withdrawCertificateConsent = (): Promise<WithdrawCertificateConsentResponse> =>
  requestApi({
    method: 'DELETE',
    url: '/vaccinations/certificate-consent',
    schema: withdrawCertificateConsentResponseSchema,
  })
