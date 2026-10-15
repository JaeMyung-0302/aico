import type { ConsentKind, MyConsent } from '@miri-pet/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyConsents, updateConsent, withdrawCertificateConsent } from './consents-api'

export const MY_CONSENTS_QUERY_KEY = ['my-consents'] as const

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_CONSENTS_QUERY_KEY }),
  })
}
