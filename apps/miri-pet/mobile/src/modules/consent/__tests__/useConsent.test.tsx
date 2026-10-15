import { act, renderHook, waitFor } from '@testing-library/react-native'
import { requestApi } from '@/shared/api/api-client'
import { ME_QUERY_KEY } from '@/modules/user/data-access-me/useMe'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { useSubmitConsents } from '../data-access-consent/useConsent'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const REQUEST = { isAge14OrOlder: true as const, consents: [{ kind: 'TERMS' as const, version: 'v' }] }

const setup = async () => {
  const client = createTestQueryClient()
  const invalidateQueries = jest.spyOn(client, 'invalidateQueries')
  const { result } = await renderHook(() => useSubmitConsents(), {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { result, invalidateQueries }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useSubmitConsents', () => {
  it('POST /me/consents 후 /me를 다시 받아 게이트가 동의 완료를 알게 한다', async () => {
    const { result, invalidateQueries } = await setup()

    await act(async () => {
      await result.current.mutateAsync(REQUEST)
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requestApi).toHaveBeenCalledWith({ method: 'POST', url: '/me/consents', data: REQUEST })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ME_QUERY_KEY })
  })

  it('서버가 거절하면(422) /me를 다시 받지 않는다', async () => {
    jest.mocked(requestApi).mockRejectedValueOnce(new Error('422'))
    const { result, invalidateQueries } = await setup()

    await act(async () => {
      await result.current.mutateAsync(REQUEST).catch(() => undefined)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
