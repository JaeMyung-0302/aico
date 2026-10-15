import type { CreateReportRequest } from '@miri-pet/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { blockUser, createReport, fetchBlockedUsers, unblockUser } from './moderation-api'

export const BLOCKED_USERS_QUERY_KEY = ['blocks'] as const

export const useBlockedUsers = () => useQuery({ queryKey: BLOCKED_USERS_QUERY_KEY, queryFn: fetchBlockedUsers })

export const useCreateReport = () =>
  useMutation({ mutationFn: (request: CreateReportRequest) => createReport(request) })

// 차단하면 상대 콘텐츠가 서버에서 걸러지므로 캐시를 새로 받는다
export const useBlockUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export const useUnblockUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
