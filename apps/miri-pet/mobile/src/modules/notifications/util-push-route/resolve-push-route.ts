import { pushDataSchema } from '@miri-pet/shared'
import type { Href } from 'expo-router'
import { type AuthGateInput, resolveAuthRedirect } from '@/modules/auth/util-auth-gate/resolve-auth-redirect'

// 푸시 탭 → 이동할 화면. data가 서버 형식(shared pushDataSchema)이 아니면 null (이동하지 않는다)
export const resolvePushRoute = (data: unknown): Href | null => {
  const parsed = pushDataSchema.safeParse(data)
  if (!parsed.success) return null
  const push = parsed.data
  if (push.kind === 'DM') {
    return { pathname: '/dm/[conversationId]', params: { conversationId: push.conversationId } }
  }
  if (push.kind === 'FOLLOW') return { pathname: '/users/[userId]', params: { userId: push.userId } }
  if (push.kind === 'VACCINATION_DUE') {
    return push.petId ? { pathname: '/pets/[petId]/entry-card', params: { petId: push.petId } } : '/(tabs)/pets'
  }
  return { pathname: '/posts/[postId]', params: { postId: push.postId } }
}

// 앱이 켜져 있을 때 받은 알림: 지금 보고 있는 대화방의 DM만 배너를 숨긴다 (메시지는 화면에 바로 보이므로)
export const shouldShowInForeground = (data: unknown, pathname: string): boolean => {
  const parsed = pushDataSchema.safeParse(data)
  if (!parsed.success || parsed.data.kind !== 'DM') return true
  return pathname !== `/dm/${parsed.data.conversationId}`
}

// 인증 게이트가 탭까지 통과시킨 상태(로그인 + 동의 + 펫 있음, 남은 리다이렉트 없음)여야 푸시 화면으로 보낸다
export const isAuthGateOpen = (input: AuthGateInput): boolean =>
  input.sessionStatus === 'signedIn' &&
  input.consentStatus === 'done' &&
  input.petStatus === 'some' &&
  resolveAuthRedirect(input) === null
