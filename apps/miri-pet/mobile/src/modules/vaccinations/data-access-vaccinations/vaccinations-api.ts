import {
  CERTIFICATE_CONSENT_VERSION,
  type CertificateUrl,
  certificateUrlSchema,
  type CreateVaccinationRequest,
  type UpcomingVaccinationResponse,
  upcomingVaccinationResponseSchema,
  type UpdateVaccinationRequest,
  type Vaccination,
  vaccinationSchema,
} from '@miri-pet/shared'
import { z } from 'zod'
import { requestApi } from '@/shared/api/api-client'

export const fetchVaccinations = (petId: string): Promise<Vaccination[]> =>
  requestApi({ method: 'GET', url: `/pets/${petId}/vaccinations`, schema: z.array(vaccinationSchema) })

export const createVaccination = (petId: string, body: CreateVaccinationRequest): Promise<Vaccination> =>
  requestApi({ method: 'POST', url: `/pets/${petId}/vaccinations`, data: body, schema: vaccinationSchema })

// 다음 접종일을 바꾸면 서버 리마인더도 새 날짜로 집계한다. 증명서는 수정 대상이 아니다
export const updateVaccination = (vaccinationId: string, body: UpdateVaccinationRequest): Promise<Vaccination> =>
  requestApi({ method: 'PATCH', url: `/vaccinations/${vaccinationId}`, data: body, schema: vaccinationSchema })

// 증명서 사진도 서버가 함께 지운다
export const deleteVaccination = (vaccinationId: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/vaccinations/${vaccinationId}` })

// 홈 D-day 배너(Phase 4)도 이 함수를 쓴다
export const fetchUpcomingVaccination = (): Promise<UpcomingVaccinationResponse> =>
  requestApi({ method: 'GET', url: '/vaccinations/upcoming', schema: upcomingVaccinationResponseSchema })

// 60초짜리 presigned URL — 열 때마다 새로 받는다 (서버가 열람 로그를 남긴다)
export const fetchCertificates = (vaccinationId: string): Promise<CertificateUrl[]> =>
  requestApi({
    method: 'GET',
    url: `/vaccinations/${vaccinationId}/certificates`,
    schema: z.array(certificateUrlSchema),
  })

// 증명서 사진 보관 별도 동의 (서버 멱등). 버전은 서버가 검증하는 공유 상수(다르면 400)
export const agreeCertificateConsent = (): Promise<void> =>
  requestApi({
    method: 'POST',
    url: '/vaccinations/certificate-consent',
    data: { version: CERTIFICATE_CONSENT_VERSION },
  })
