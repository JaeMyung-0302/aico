import { coupleSchema, type Couple, createInviteResponseSchema, type CreateInviteResponse } from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// 커플 id 는 보내지 않는다 — 서버 CoupleGuard 가 토큰의 사용자로 커플을 찾는다
export const createInvite = (): Promise<CreateInviteResponse> =>
  requestApi({ method: 'POST', url: '/couples/invites', schema: createInviteResponseSchema })

export const joinCouple = (code: string): Promise<Couple> =>
  requestApi({ method: 'POST', url: '/couples/join', data: { code }, schema: coupleSchema })

export const fetchCouple = (): Promise<Couple> =>
  requestApi({ method: 'GET', url: '/couples/me', schema: coupleSchema })

export const updateStartedOn = (startedOn: string): Promise<Couple> =>
  requestApi({ method: 'PATCH', url: '/couples/me', data: { startedOn }, schema: coupleSchema })

export const unlinkCouple = (): Promise<Couple> =>
  requestApi({ method: 'POST', url: '/couples/me/unlink', schema: coupleSchema })

export const reconnectCouple = (): Promise<Couple> =>
  requestApi({ method: 'POST', url: '/couples/me/reconnect', schema: coupleSchema })
