import type { ConsentKind, MyConsent } from '@miri-pet/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyConsents, updateConsent, withdrawCertificateConsent } from './consents-api'

export const MY_CONSENTS_QUERY_KEY = ['my-consents'] as const
const VACCINATIONS_QUERY_PREFIX = ['vaccinations'] as const

export const useMyConsents = ({ isEnabled = true }: { isEnabled?: boolean } = {}) =>
  useQuery({ queryKey: MY_CONSENTS_QUERY_KEY, queryFn: fetchMyConsents, enabled: isEnabled })

export const useUpdateConsent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { kind: ConsentKind; isAgreed: boolean }) => updateConsent(input),
    onSuccess: (consents: MyConsent[]) => queryClient.setQueryData(MY_CONSENTS_QUERY_KEY, consents),
  })
}

export const useWithdrawCertificateConsent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => withdrawCertificateConsent(),
    // 철회하면 서버가 증명서 사진을 지운다 → 접종 기록(증명서 수)·증명서 원본 캐시(['vaccinations', ...])도 다시 받는다
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_CONSENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: VACCINATIONS_QUERY_PREFIX }),
      ]),
  })
}
