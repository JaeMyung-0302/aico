import type { MessagePage } from '@miri-pet/shared'
import type { InfiniteData } from '@tanstack/react-query'
import { testId } from '@/modules/feed/__fixtures__/posts'
import { createTestQueryClient } from '@/test-utils/QueryTestProvider'
import { CONVERSATION_ID, makeMessage } from '../__fixtures__/dm'
import { catchUpMessages } from '../data-access-dm/catch-up-messages'
import { fetchMessagesAfter } from '../data-access-dm/dm-api'
import { messagesQueryKey } from '../data-access-dm/query-keys'

jest.mock('../data-access-dm/dm-api', () => ({ fetchMessagesAfter: jest.fn() }))

const message = (n: number) => makeMessage({ id: testId(960 + n), body: `메시지 ${n}` })
type Cache = InfiniteData<MessagePage, string | null>

// 최신순 캐시: 첫 페이지 맨 앞이 가장 최근 메시지
const seed = (items: ReturnType<typeof message>[], conversationId = CONVERSATION_ID) => {
  const client = createTestQueryClient()
  client.setQueryData<Cache>(messagesQueryKey(conversationId), {
    pages: [{ items, nextCursor: null }],
    pageParams: [null],
  })
  return client
}

const idsOf = (client: ReturnType<typeof createTestQueryClient>, conversationId = CONVERSATION_ID) =>
  client.getQueryData<Cache>(messagesQueryKey(conversationId))?.pages[0]?.items.map((item) => item.id)

beforeEach(() => jest.clearAllMocks())

describe('재연결 후 놓친 메시지 복구 (after 커서)', () => {
  it('가장 최근 메시지 이후를 페이지 끝까지 받아 최신순으로 앞에 붙이고, 같은 id는 한 번만 둔다', async () => {
    const client = seed([message(2), message(1)])
    jest
      .mocked(fetchMessagesAfter)
      // 서버는 after 이후를 오래된순으로 준다
      .mockResolvedValueOnce({ items: [message(2), message(3), message(4)], nextCursor: message(4).id })
      .mockResolvedValueOnce({ items: [message(5)], nextCursor: null })

    await catchUpMessages(client)

    expect(fetchMessagesAfter).toHaveBeenNthCalledWith(1, CONVERSATION_ID, message(2).id)
    expect(fetchMessagesAfter).toHaveBeenNthCalledWith(2, CONVERSATION_ID, message(4).id)
    expect(idsOf(client)).toEqual([message(5), message(4), message(3), message(2), message(1)].map((m) => m.id))
  })

  it('놓친 메시지가 없으면 캐시를 그대로 둔다', async () => {
    const client = seed([message(1)])
    jest.mocked(fetchMessagesAfter).mockResolvedValue({ items: [], nextCursor: null })
    await catchUpMessages(client)
    expect(idsOf(client)).toEqual([message(1).id])
  })

  it('열어 둔 대화가 없으면 요청하지 않는다', async () => {
    await catchUpMessages(createTestQueryClient())
    expect(fetchMessagesAfter).not.toHaveBeenCalled()
  })

  it('메시지가 없던 대화는 기준 id가 없으므로 처음부터 다시 받도록 무효화한다', async () => {
    const client = seed([])
    await catchUpMessages(client)
    expect(fetchMessagesAfter).not.toHaveBeenCalled()
    expect(client.getQueryState(messagesQueryKey(CONVERSATION_ID))?.isInvalidated).toBe(true)
  })

  it('복구 요청이 실패하면 그 대화 메시지를 처음부터 다시 받도록 무효화한다', async () => {
    const client = seed([message(1)])
    jest.mocked(fetchMessagesAfter).mockRejectedValue(new Error('offline'))
    await catchUpMessages(client)
    expect(client.getQueryState(messagesQueryKey(CONVERSATION_ID))?.isInvalidated).toBe(true)
  })

  it('여러 대화를 각각 복구한다', async () => {
    const OTHER = testId(955)
    const client = seed([message(1)])
    client.setQueryData<Cache>(messagesQueryKey(OTHER), {
      pages: [{ items: [makeMessage({ id: testId(990), conversationId: OTHER })], nextCursor: null }],
      pageParams: [null],
    })
    jest.mocked(fetchMessagesAfter).mockResolvedValue({ items: [], nextCursor: null })
    await catchUpMessages(client)
    expect(fetchMessagesAfter).toHaveBeenCalledWith(CONVERSATION_ID, message(1).id)
    expect(fetchMessagesAfter).toHaveBeenCalledWith(OTHER, testId(990))
  })
})
