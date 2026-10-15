import { renderHook } from '@testing-library/react-native'
import type { Analytics } from '../posthog'
import { useAnalyticsIdentity } from '../use-analytics-identity'

const createFakeAnalytics = (): Analytics & { setUserId: jest.Mock } => ({ tracker: jest.fn(), setUserId: jest.fn() })

describe('useAnalyticsIdentity', () => {
  it('analytics가 없으면(키 없음) 아무것도 하지 않는다', async () => {
    await expect(renderHook(() => useAnalyticsIdentity(null, 'user-1'))).resolves.toBeDefined()
  })

  it('userId가 바뀔 때마다 setUserId로 전달한다 (로그인 → 로그아웃)', async () => {
    const analytics = createFakeAnalytics()
    const { rerender } = await renderHook(({ userId }: { userId: string | null }) => useAnalyticsIdentity(analytics, userId), {
      initialProps: { userId: null as string | null },
    })
    await rerender({ userId: 'user-1' })
    await rerender({ userId: null })
    expect(analytics.setUserId.mock.calls).toEqual([[null], ['user-1'], [null]])
  })
})
