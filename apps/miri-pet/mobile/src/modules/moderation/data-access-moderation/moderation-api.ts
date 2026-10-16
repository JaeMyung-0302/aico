import { blockListSchema, type CreateReportRequest, type UserSummary } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

// 서버 응답 201 { id } — 화면은 id를 쓰지 않으므로 본문은 검증하지 않는다
export const createReport = (request: CreateReportRequest): Promise<void> =>
  requestApi({ method: 'POST', url: '/reports', data: request })

export const blockUser = (userId: string): Promise<void> => requestApi({ method: 'POST', url: `/blocks/${userId}` })

export const unblockUser = (userId: string): Promise<void> => requestApi({ method: 'DELETE', url: `/blocks/${userId}` })

export const fetchBlockedUsers = async (): Promise<UserSummary[]> => {
  const { items } = await requestApi({ method: 'GET', url: '/blocks', schema: blockListSchema })
  return items
}
