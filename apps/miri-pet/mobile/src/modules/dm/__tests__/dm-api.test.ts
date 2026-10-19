import { messagePageSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import { CONVERSATION_ID } from '../__fixtures__/dm'
import { fetchMessagesAfter } from '../data-access-dm/dm-api'

jest.mock('@/shared/api/api-client', () => ({ requestApi: jest.fn(async () => undefined) }))

describe('dm-api', () => {
  it('fetchMessagesAfter: 재연결 복구용 GET …/messages?after=<id> (cursor 없이)', async () => {
    const after = '0199e3a0-0000-7000-8000-000000000961'
    await fetchMessagesAfter(CONVERSATION_ID, after)
    expect(requestApi).toHaveBeenCalledWith({
      method: 'GET',
      url: `/dm/conversations/${CONVERSATION_ID}/messages`,
      params: { after },
      schema: messagePageSchema,
    })
  })
})
