import { act, renderHook, waitFor } from '@testing-library/react-native'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { ApiError } from '@/shared/api/api-error'
import { createTestQueryClient, QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { CONVERSATION_ID, makeMessage, ME_ID } from '../__fixtures__/dm'
import { sendMessage } from '../data-access-dm/dm-api'
import { messagesQueryKey } from '../data-access-dm/query-keys'
import { useSendMessage } from '../data-access-dm/useSendMessage'

jest.mock('../data-access-dm/dm-api', () => ({ sendMessage: jest.fn() }))
jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))

const networkError = () => new ApiError({ code: 'NETWORK', message: '네트워크 연결을 확인해 주세요' })

const renderSend = async () => {
  const client = createTestQueryClient()
  const view = await renderHook(() => useSendMessage(CONVERSATION_ID), {
    wrapper: ({ children }) => <QueryTestProvider client={client}>{children}</QueryTestProvider>,
  })
  return { ...view, client }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useSendMessage', () => {
  it('보내는 동안 낙관적 말풍선(sending)을 보여주고, 성공하면 메시지 캐시에 넣는다', async () => {
    const saved = makeMessage({ id: '0199e3a0-0000-7000-8000-000000000999', senderId: ME_ID, body: '안녕하세요' })
    let resolveSend: (message: typeof saved) => void = () => undefined
    jest.mocked(sendMessage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve
        }),
    )
    const { result, client } = await renderSend()
    await act(async () => {
      result.current.send({ body: '안녕하세요' })
    })
    expect(result.current.pending).toEqual([
      expect.objectContaining({ body: '안녕하세요', status: 'sending', clientMessageId: expect.any(String) }),
    ])
    await act(async () => resolveSend({ ...saved, clientMessageId: result.current.pending[0]!.clientMessageId }))
    await waitFor(() => expect(result.current.pending).toEqual([]))
    const cached = client.getQueryData<{ pages: { items: { id: string }[] }[] }>(messagesQueryKey(CONVERSATION_ID))
    expect(cached?.pages[0]?.items.map((item) => item.id)).toEqual([saved.id])
  })

  it('실패하면 failed로 남고, 다시 보내기는 같은 clientMessageId로 재시도한다', async () => {
    jest.mocked(sendMessage).mockRejectedValueOnce(networkError()).mockResolvedValueOnce(makeMessage())
    const { result } = await renderSend()
    await act(async () => {
      result.current.send({ body: '재시도 해 주세요' })
    })
    await waitFor(() => expect(result.current.pending[0]?.status).toBe('failed'))
    const { clientMessageId } = result.current.pending[0]!

    await act(async () => {
      result.current.retry(clientMessageId)
    })
    await waitFor(() => expect(result.current.pending).toEqual([]))
    expect(sendMessage).toHaveBeenCalledTimes(2)
    const ids = jest.mocked(sendMessage).mock.calls.map(([, request]) => request.clientMessageId)
    expect(ids).toEqual([clientMessageId, clientMessageId])
    expect(jest.mocked(sendMessage).mock.calls[1]?.[1]).toEqual({ clientMessageId, body: '재시도 해 주세요' })
  })

  it('사진은 한 번만 올리고, 재시도할 때는 올린 mediaId를 다시 쓴다', async () => {
    jest.mocked(uploadImage).mockResolvedValue('0199e3a0-0000-7000-8000-000000000777')
    jest.mocked(sendMessage).mockRejectedValueOnce(networkError()).mockResolvedValueOnce(makeMessage())
    const { result } = await renderSend()
    await act(async () => {
      result.current.send({ image: { uri: 'file:///dog.jpg', width: 800, height: 600 } })
    })
    await waitFor(() => expect(result.current.pending[0]?.status).toBe('failed'))
    await act(async () => {
      result.current.retry(result.current.pending[0]!.clientMessageId)
    })
    await waitFor(() => expect(result.current.pending).toEqual([]))
    expect(uploadImage).toHaveBeenCalledTimes(1)
    expect(uploadImage).toHaveBeenCalledWith({ uri: 'file:///dog.jpg', width: 800, height: 600 }, 'DM')
    expect(jest.mocked(sendMessage).mock.calls[1]?.[1]).toMatchObject({
      mediaId: '0199e3a0-0000-7000-8000-000000000777',
    })
  })

  it('clientMessageId는 보낼 때마다 다르고 서버 계약(8~64자)을 지킨다', async () => {
    jest.mocked(sendMessage).mockRejectedValue(networkError())
    const { result } = await renderSend()
    await act(async () => {
      result.current.send({ body: '하나' })
      result.current.send({ body: '둘' })
    })
    await waitFor(() => expect(result.current.pending).toHaveLength(2))
    const [first, second] = result.current.pending.map((item) => item.clientMessageId)
    expect(first).not.toBe(second)
    expect(first!.length).toBeGreaterThanOrEqual(8)
    expect(first!.length).toBeLessThanOrEqual(64)
  })
})
