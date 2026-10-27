import {
  consentsSchema,
  type Consents,
  meResponseSchema,
  type MeResponse,
  type PutConsentsRequest,
  type UpdateMeRequest,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

export const fetchMe = (): Promise<MeResponse> => requestApi({ method: 'GET', url: '/me', schema: meResponseSchema })

export const updateMe = (body: UpdateMeRequest): Promise<MeResponse> =>
  requestApi({ method: 'PATCH', url: '/me', data: body, schema: meResponseSchema })

export const putConsents = (body: PutConsentsRequest): Promise<Consents> =>
  requestApi({ method: 'PUT', url: '/me/consents', data: body, schema: consentsSchema })

// 회원 탈퇴: 서버가 커플을 UNLINKING으로 바꾸고 세션·푸시 토큰·카카오 연결을 정리한다
export const deleteMe = (): Promise<void> => requestApi({ method: 'DELETE', url: '/me' })
