import type { SubmitConsentsRequest } from '@miri-pet/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { requestApi } from '@/shared/api/api-client'
import { ME_QUERY_KEY } from '@/modules/user/data-access-me/useMe'

export const submitConsents = (request: SubmitConsentsRequest): Promise<void> =>
  requestApi({ method: 'POST', url: '/me/consents', data: request })

// 동의 저장 → /me 재조회(hasRequiredConsents=true) → 인증 게이트가 탭으로 보낸다
export const useSubmitConsents = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: SubmitConsentsRequest) => submitConsents(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
  })
}
