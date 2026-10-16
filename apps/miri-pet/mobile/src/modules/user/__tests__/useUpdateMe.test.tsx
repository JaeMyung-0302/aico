import { act, renderHook } from '@testing-library/react-native'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { fetchMe, updateMe } from '../data-access-me/me-api'
import { ME_QUERY_KEY, useUpdateMe } from '../data-access-me/useMe'

jest.mock('../data-access-me/me-api', () => ({ fetchMe: jest.fn(), updateMe: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const ME = {
  id: '01890a5d-ac96-774b-bcce-b302099a8057',
  nickname: 'bori',
  avatarUrl: null,
  bio: null,
  role: 'USER' as const,
  notifyVaccination: true,
  notifySocial: true,
  notifyDm: true,
  hasRequiredConsents: true,
}

const setup = async () => {
  const client = createTestQueryClient()
  client.setQueryData(ME_QUERY_KEY, ME)
  const { result } = await renderHook(() => useUpdateMe(), {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { client, result }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchMe).mockResolvedValue(ME)
})

describe('useUpdateMe (알림 토글)', () => {
  it('응답 전에 캐시를 바로 바꾼다 (낙관적 업데이트)', async () => {
    let resolveUpdate: (value: typeof ME) => void = () => undefined
    jest.mocked(updateMe).mockImplementation(() => new Promise((resolve) => (resolveUpdate = resolve)))
    const { client, result } = await setup()

    await act(async () => {
      result.current.mutate({ notifySocial: false })
    })

    expect(client.getQueryData(ME_QUERY_KEY)).toMatchObject({ notifySocial: false, notifyDm: true })
    expect(updateMe).toHaveBeenCalledWith({ notifySocial: false })
    await act(async () => resolveUpdate({ ...ME, notifySocial: false }))
  })

  it('실패하면 이전 값으로 되돌린다', async () => {
    jest.mocked(updateMe).mockRejectedValue(new Error('500'))
    jest.mocked(fetchMe).mockRejectedValue(new Error('500'))
    const { client, result } = await setup()

    await act(async () => {
      await result.current.mutateAsync({ notifyDm: false }).catch(() => undefined)
    })

    expect(client.getQueryData(ME_QUERY_KEY)).toMatchObject({ notifyDm: true })
  })
})
