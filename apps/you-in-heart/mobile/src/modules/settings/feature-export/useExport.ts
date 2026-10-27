import type { ExportJob } from '@you-in-heart/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EXPORT_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { fetchLatestExport, requestExport } from './export-api'

const POLL_MS = 5000

const isInProgress = (job: ExportJob | null | undefined): boolean => job?.status === 'PENDING' || job?.status === 'RUNNING'

// 진행 중이면 5초마다 다시 받는다(완료 푸시를 놓쳐도 화면이 따라간다)
export const useLatestExport = () => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({
    queryKey: EXPORT_QUERY_KEY,
    queryFn: fetchLatestExport,
    enabled: isSignedIn,
    refetchInterval: (query) => (isInProgress(query.state.data) ? POLL_MS : false),
  })
}

export const useRequestExport = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: requestExport,
    onSuccess: (job) => queryClient.setQueryData(EXPORT_QUERY_KEY, job),
  })
}
