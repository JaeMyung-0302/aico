import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { makePost } from '@/modules/feed/__fixtures__/posts'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makeConversation, PEER } from '../__fixtures__/dm'
import { fetchConversations, sendMessage } from '../data-access-dm/dm-api'
import ShareToDmButton from '../ui-share-to-dm/ShareToDmButton'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('../data-access-dm/dm-api', () => ({ fetchConversations: jest.fn(), sendMessage: jest.fn() }))

const POST = makePost({ caption: '첫 애견동반 카페 성공!' })
const CONVERSATION = makeConversation()

const renderButton = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <ShareToDmButton post={POST} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchConversations).mockResolvedValue({ items: [CONVERSATION], nextCursor: null })
  jest.mocked(sendMessage).mockImplementation(async (conversationId, request) => ({
    id: '0199e3a0-0000-7000-8000-000000000990',
    conversationId,
    senderId: '0199e3a0-0000-7000-8000-000000000900',
    body: request.body ?? null,
    imageUrl: null,
    clientMessageId: request.clientMessageId,
    createdAt: '2026-10-15T06:00:00.000Z',
  }))
})

describe('게시물 DM 공유', () => {
  it('대화 목록(수락된 대화)에서 고르면 게시물 링크를 메시지로 보낸다', async () => {
    const user = userEvent.setup()
    await renderButton()
    await user.press(screen.getByRole('button', { name: 'DM으로 공유' }))
    expect(fetchConversations).toHaveBeenCalledWith('ACCEPTED', null)
    await user.press(await screen.findByRole('button', { name: `${PEER.nickname}에게 보내기` }))
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1))
    const [conversationId, request] = jest.mocked(sendMessage).mock.calls[0]!
    expect(conversationId).toBe(CONVERSATION.id)
    expect(request.body).toContain(`miripet://posts/${POST.id}`)
    expect(await screen.findByText('보냈어요')).toBeOnTheScreen()
  })

  it('대화가 없으면 안내', async () => {
    jest.mocked(fetchConversations).mockResolvedValue({ items: [], nextCursor: null })
    const user = userEvent.setup()
    await renderButton()
    await user.press(screen.getByRole('button', { name: 'DM으로 공유' }))
    expect(await screen.findByText('공유할 대화가 없어요')).toBeOnTheScreen()
  })
})
