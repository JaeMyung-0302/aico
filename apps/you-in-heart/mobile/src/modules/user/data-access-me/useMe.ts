import type { MeResponse } from '@you-in-heart/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { signOutDevice } from '@/modules/auth/data-access-auth/sign-out-device'
import { ME_QUERY_KEY } from '@/shared/auth/query-keys'
import { useSessionStatus } from '@/shared/auth/session'
import { deleteMe, fetchMe, putConsents, updateMe } from './me-api'

type UseMeOptions = {
  // 초대 코드 화면: 상대가 코드를 입력했는지 주기적으로 확인한다
  pollIntervalMs?: number
}

export const useMe = ({ pollIntervalMs }: UseMeOptions = {}) => {
  const isSignedIn = useSessionStatus() === 'signedIn'
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, enabled: isSignedIn, refetchInterval: pollIntervalMs })
}

// 로그인 화면 문구("시작하면 … 동의하게 돼요")대로 필수 동의를 함께 기록한다. 위치는 선택(나중에 설정)
const saveProfile = async ({ displayName, me }: { displayName: string; me: MeResponse | undefined }) => {
  const hasRequiredConsents = me?.consents.terms === true && me.consents.privacy === true
  if (!hasRequiredConsents) await putConsents({ terms: true, privacy: true, location: me?.consents.location ?? false })
  return updateMe({ displayName })
}

export const useUpdateMe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (displayName: string) =>
      saveProfile({ displayName, me: queryClient.getQueryData<MeResponse>(ME_QUERY_KEY) }),
    onSuccess: (me) => queryClient.setQueryData(ME_QUERY_KEY, me),
  })
}

// 탈퇴 성공 → 기기 세션을 끝낸다(서버가 세션을 이미 지웠으므로 서버 로그아웃은 보내지 않는다)
export const useDeleteMe = () =>
  useMutation({
    mutationFn: async () => {
      await deleteMe()
      await signOutDevice({ isAccountDeleted: true })
    },
  })
