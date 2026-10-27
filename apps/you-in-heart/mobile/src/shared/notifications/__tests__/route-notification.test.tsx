import { renderHook } from '@testing-library/react-native'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import type { ReactNode } from 'react'
import { EXPORT_QUERY_KEY } from '@/shared/auth/query-keys'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { notificationHref, useNotificationRouting } from '../route-notification'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))

const ENTRY_ID = '01890a5d-ac96-774b-bcce-b302099a8201'
const JOB_ID = '01890a5d-ac96-774b-bcce-b302099a8501'

type ResponseListener = Parameters<typeof Notifications.addNotificationResponseReceivedListener>[0]

describe('route-notification', () => {
  it('푸시 data 로 갈 곳을 정한다 (모르는 형식은 무시)', () => {
    expect(notificationHref({ type: 'PARTNER_ENTRY', entryId: ENTRY_ID })).toBe(`/diary/${ENTRY_ID}`)
    expect(notificationHref({ type: 'EXPORT_READY', jobId: JOB_ID })).toBe('/settings')
    expect(notificationHref({ type: 'PARTNER_ENTRY', entryId: '../etc' })).toBeNull()
    expect(notificationHref({ type: 'ANNIVERSARY' })).toBeNull()
    expect(notificationHref(null)).toBeNull()
  })

  it('알림을 누르면 이동하고, EXPORT_READY 는 내보내기 상태를 다시 받는다', async () => {
    let listener: ResponseListener | null = null
    const remove = jest.fn()
    jest.mocked(Notifications.addNotificationResponseReceivedListener).mockImplementation((next) => {
      listener = next
      return { remove }
    })
    const client = createTestQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>
    const { unmount } = await renderHook(() => useNotificationRouting(), { wrapper })

    const respond = (data: Record<string, unknown>) =>
      listener?.({
        actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
        notification: { request: { content: { data } } },
      } as Parameters<ResponseListener>[0])

    respond({ type: 'PARTNER_ENTRY', entryId: ENTRY_ID })
    expect(router.push).toHaveBeenLastCalledWith(`/diary/${ENTRY_ID}`)

    respond({ type: 'EXPORT_READY', jobId: JOB_ID })
    expect(router.push).toHaveBeenLastCalledWith('/settings')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: EXPORT_QUERY_KEY })

    await unmount()
    expect(remove).toHaveBeenCalled()
  })
})
