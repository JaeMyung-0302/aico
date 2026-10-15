import { type NotificationPage, notificationPageSchema, type UnreadCount, unreadCountSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

export const fetchNotifications = (cursor: string | null): Promise<NotificationPage> =>
  requestApi({
    method: 'GET',
    url: '/notifications',
    params: cursor ? { cursor } : {},
    schema: notificationPageSchema,
  })

export const fetchUnreadCount = (): Promise<UnreadCount> =>
  requestApi({ method: 'GET', url: '/notifications/unread-count', schema: unreadCountSchema })

export const readAllNotifications = (): Promise<void> => requestApi({ method: 'POST', url: '/notifications/read-all' })
