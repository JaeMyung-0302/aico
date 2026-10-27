import { idSchema } from '@you-in-heart/shared'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { z } from 'zod'
import { EXPORT_QUERY_KEY } from '@/shared/auth/query-keys'

// 서버 푸시 data: 상대 새 기록(1G.4), 내보내기 완료(1G.3). 모르는 형식은 무시한다
const pushDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PARTNER_ENTRY'), entryId: idSchema }),
  z.object({ type: z.literal('EXPORT_READY'), jobId: idSchema }),
])

export const notificationHref = (data: unknown): string | null => {
  const parsed = pushDataSchema.safeParse(data)
  if (!parsed.success) return null
  return parsed.data.type === 'PARTNER_ENTRY' ? `/diary/${parsed.data.entryId}` : '/settings'
}

// 루트 레이아웃에서 한 번: 알림을 누르면 해당 화면으로 (내보내기 완료면 상태도 다시 받는다)
// TODO(출시 전 실기기): 앱이 꺼진 상태에서 누른 알림(getLastNotificationResponse) 처리 확인
export const useNotificationRouting = (): void => {
  const queryClient = useQueryClient()
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: unknown = response.notification.request.content.data
      const href = notificationHref(data)
      if (!href) return
      if (href === '/settings') queryClient.invalidateQueries({ queryKey: EXPORT_QUERY_KEY }).catch(() => undefined)
      router.push(href)
    })
    return () => subscription.remove()
  }, [queryClient])
}
