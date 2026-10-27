import {
  type AnniversaryItem,
  anniversaryListResponseSchema,
  type CreateCustomAnniversaryRequest,
  type CustomAnniversary,
  customAnniversarySchema,
  type UpdateCustomAnniversaryRequest,
} from '@you-in-heart/shared'
import { requestApi } from '@/shared/api/api-client'

// 자동(100일 단위·N주년)과 커스텀을 서버가 날짜순으로 합쳐 준다. 커플 id 는 토큰으로 서버가 찾는다
export const fetchAnniversaries = async ({ from, to }: { from: string; to: string }): Promise<AnniversaryItem[]> => {
  const { items } = await requestApi({
    method: 'GET',
    url: '/anniversaries',
    params: { from, to },
    schema: anniversaryListResponseSchema,
  })
  return items
}

export const createAnniversary = (body: CreateCustomAnniversaryRequest): Promise<CustomAnniversary> =>
  requestApi({ method: 'POST', url: '/anniversaries', data: body, schema: customAnniversarySchema })

// 커스텀(uuid)만 고치고 지울 수 있다 — 자동 기념일 id('auto:…')는 서버가 400
export const updateAnniversary = (id: string, body: UpdateCustomAnniversaryRequest): Promise<CustomAnniversary> =>
  requestApi({
    method: 'PATCH',
    url: `/anniversaries/${encodeURIComponent(id)}`,
    data: body,
    schema: customAnniversarySchema,
  })

export const deleteAnniversary = (id: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/anniversaries/${encodeURIComponent(id)}` })
