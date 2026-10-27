import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { MeResponse } from '@you-in-heart/shared'
import { AppState, type AppStateStatus } from 'react-native'
import { fetchAnniversaries } from '@/modules/anniversary/data-access-anniversary/anniversary-api'
import { fetchCouple } from '@/modules/couple/data-access-couple/couple-api'
import { fetchMe } from '@/modules/user/data-access-me/me-api'
import { ME_QUERY_KEY } from '@/shared/auth/query-keys'
import { session } from '@/shared/auth/session'
import { ACTIVE_COUPLE, ANNIVERSARY_ITEMS, FIXED_NOW_MS, mockClockAt, ME, toSummary } from '@/test-utils/fixtures'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { flushWidgetEvents } from '../data-access-widget/widget-events'
import { clearWidgetSnapshot, writeWidgetSnapshot } from '../data-access-widget/widget-storage'
import { useWidgetSync } from '../feature-widget-sync/useWidgetSync'

jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn() }))
jest.mock('@/modules/couple/data-access-couple/couple-api', () => ({ fetchCouple: jest.fn() }))
jest.mock('@/modules/anniversary/data-access-anniversary/anniversary-api', () => ({ fetchAnniversaries: jest.fn() }))
jest.mock('../data-access-widget/widget-storage', () => ({
  writeWidgetSnapshot: jest.fn(async () => undefined),
  clearWidgetSnapshot: jest.fn(async () => undefined),
}))
jest.mock('../data-access-widget/widget-events', () => ({ flushWidgetEvents: jest.fn(async () => undefined) }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const TOKENS = { accessToken: 'a', refreshToken: 'r' }

let appStateListener: ((state: AppStateStatus) => void) | null = null

const renderSync = () => {
  const client = createTestQueryClient()
  const view = renderHook(() => useWidgetSync(), {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { client, view }
}

const lastWritten = () => jest.mocked(writeWidgetSnapshot).mock.calls.at(-1)?.[0]

// 로그인된 상태에서 첫 스냅샷까지 쓴 뒤 호출 기록을 비운다
const renderSignedIn = async () => {
  await session.signIn(TOKENS)
  const rendered = renderSync()
  await rendered.view
  await waitFor(() => expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1))
  jest.mocked(writeWidgetSnapshot).mockClear()
  jest.mocked(clearWidgetSnapshot).mockClear()
  return rendered
}

const setMe = (client: ReturnType<typeof createTestQueryClient>, me: MeResponse) =>
  act(() => {
    client.setQueryData(ME_QUERY_KEY, me)
  })

beforeEach(async () => {
  jest.clearAllMocks()
  mockClockAt(FIXED_NOW_MS)
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener
    return { remove: jest.fn() }
  })
  await session.endSession()
  jest.mocked(clearWidgetSnapshot).mockClear()
  jest.mocked(fetchMe).mockResolvedValue(ME)
  jest.mocked(fetchCouple).mockResolvedValue(ACTIVE_COUPLE)
  jest.mocked(fetchAnniversaries).mockResolvedValue(ANNIVERSARY_ITEMS)
})

afterEach(() => {
  jest.restoreAllMocks()
  appStateListener = null
})

describe('useWidgetSync', () => {
  it('로그인하면 /me·커플·기념일을 다 받은 뒤 스냅샷을 1회 쓰고 대기 중인 위젯 이벤트를 보낸다', async () => {
    const { view } = renderSync()
    await view
    await act(() => session.signIn(TOKENS))

    await waitFor(() => expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(lastWritten()).toEqual({
      v: 1,
      startedOn: '2025-09-10',
      names: ['재명', '지은'],
      next: { title: '500일', date: '2027-01-22' },
    })
    expect(flushWidgetEvents).toHaveBeenCalledTimes(1)
  })

  it('미로그인으로 시작하면 남아 있을 수 있는 스냅샷을 지운다(쓰기 없음)', async () => {
    const { view } = renderSync()
    await view
    await waitFor(() => expect(clearWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(writeWidgetSnapshot).not.toHaveBeenCalled()
    expect(flushWidgetEvents).not.toHaveBeenCalled()
  })

  it('페어링되면(미연결 → 연결) 1회 쓴다', async () => {
    jest.mocked(fetchMe).mockResolvedValue({ ...ME, couple: null })
    await session.signIn(TOKENS)
    const { client, view } = renderSync()
    await view
    await waitFor(() => expect(clearWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(writeWidgetSnapshot).not.toHaveBeenCalled()

    await setMe(client, ME)
    await waitFor(() => expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1))
  })

  it('사귄 날이 바뀌면 1회 쓴다', async () => {
    const { client } = await renderSignedIn()
    await setMe(client, { ...ME, couple: { ...toSummary(ACTIVE_COUPLE), startedOn: '2025-09-11' } })
    await waitFor(() => expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(lastWritten()?.startedOn).toBe('2025-09-11')
  })

  it('기념일이 바뀌면(다음 기념일 변경) 1회 쓴다', async () => {
    const { client } = await renderSignedIn()
    const birthday = { id: 'c9', refKey: 'custom:c9', kind: 'CUSTOM' as const, title: '생일', date: '2026-11-01' }
    await act(() => {
      client.setQueriesData({ queryKey: ['anniversaries'] }, [birthday, ...ANNIVERSARY_ITEMS])
    })
    await waitFor(() => expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(lastWritten()?.next).toEqual({ title: '생일', date: '2026-11-01' })
  })

  it('같은 내용으로 다시 그려질 때는 쓰지 않는다', async () => {
    const { client } = await renderSignedIn()
    await setMe(client, { ...ME })
    await act(async () => undefined)
    expect(writeWidgetSnapshot).not.toHaveBeenCalled()
  })

  it('앱이 포그라운드로 돌아오면 1회 쓴다', async () => {
    await renderSignedIn()
    await act(() => appStateListener?.('background'))
    await act(() => appStateListener?.('active'))
    await waitFor(() => expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1))
    // 이미 활성 상태에서 다시 active 가 와도 쓰지 않는다
    await act(() => appStateListener?.('active'))
    expect(writeWidgetSnapshot).toHaveBeenCalledTimes(1)
  })

  it('로그아웃(세션 종료 — 탈퇴·refresh 실패 포함)하면 스냅샷을 지우고 위젯을 다시 그린다', async () => {
    await renderSignedIn()
    await act(() => session.endSession())
    await waitFor(() => expect(clearWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(writeWidgetSnapshot).not.toHaveBeenCalled()
  })

  it('연결 해제(UNLINKING)되면 스냅샷을 지운다', async () => {
    const { client } = await renderSignedIn()
    const unlinking = { ...toSummary(ACTIVE_COUPLE), status: 'UNLINKING' as const }
    await setMe(client, { ...ME, couple: unlinking })
    await waitFor(() => expect(clearWidgetSnapshot).toHaveBeenCalledTimes(1))
    expect(writeWidgetSnapshot).not.toHaveBeenCalled()
  })
})
