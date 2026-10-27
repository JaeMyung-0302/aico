import type { MeResponse } from '@you-in-heart/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { putConsents } from '@/modules/user/data-access-me/me-api'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { ME_QUERY_KEY } from '@/shared/auth/query-keys'

// LOCATION 동의(선택). PUT /me/consents 는 전체 상태를 보낸다 — 필수 동의는 이미 했으므로 true 로 함께 보낸다
export const useLocationConsent = () => {
  const queryClient = useQueryClient()
  const me = useMe()
  const mutation = useMutation({
    mutationFn: (location: boolean) => putConsents({ terms: true, privacy: true, location }),
    onSuccess: (consents) =>
      queryClient.setQueryData<MeResponse>(ME_QUERY_KEY, (current) => (current ? { ...current, consents } : current)),
  })
  return {
    isOn: me.data?.consents.location === true,
    isKnown: me.data !== undefined,
    setLocation: (next: boolean) => mutation.mutate(next),
    isPending: mutation.isPending,
    isError: mutation.isError,
  }
}
